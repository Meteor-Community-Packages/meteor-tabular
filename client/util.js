/* global Util:true, _ */

Util = {};

Util.cleanFieldName = function cleanFieldName(field) {
  // for field names with a dot, we just need
  // the top level field name
  var dot = field.indexOf(".");
  if (dot !== -1) {
    field = field.slice(0, dot);
  }

  // If it's referencing an array, strip off the brackets
  field = field.split('[')[0];

  return field;
};

Util.cleanFieldNameForSearch = function cleanFieldNameForSearch(field) {
  // Do a quick check to see if regex is necessary:
  if (field.indexOf('[') !== -1) {
    // Check if object has ["foo"]
    if (field.indexOf('\"') !== -1) {
      console.warn('The field, '+field+' contains a " character and will not be properly parsed');
    }
    // Otherwise, it should be referencing an array, so replace the brackets
    return field.replace(/\[\w+\]/, "");
  }
  return field;
};

Util.sortsAreEqual = function sortsAreEqual(oldVal, newVal) {
  if (oldVal === newVal) {
    return true;
  }
  var areSame = false;
  if (_.isArray(oldVal) && _.isArray(newVal)
    && oldVal.length === newVal.length) {
    areSame = _.every(newVal, function (innerArray, i) {
      return innerArray[0] === oldVal[i][0] &&
        innerArray[1] === oldVal[i][1];
    });
  }
  return areSame;
};

Util.objectsAreEqual = function objectsAreEqual(oldVal, newVal) {
  if (oldVal === newVal) {
    return true;
  }
  return JSON.stringify(oldVal) === JSON.stringify(newVal);
};


// Take the DataTables `order` format and column info
// and convert it into a mongo sort array.
Util.getMongoSort = function getMongoSort(order, columns) {
  if (!order || !columns) {
    return;
  }

  // TODO support the nested arrays format for sort
  var sort = [];
  _.each(order, function (ord) {
    var orderable = columns[ord.column].orderable;
    // Use 'query' to account for un-sortable instance functions in 'data':
    // If multiple names, accept first propName as listed by user
    var propName = columns[ord.column].query;
    var propNames = propName.split(' ');
    // Ignore instance functions like "foo()"
    if (propNames[0].indexOf("()") !== -1) {
      console.warn('The class name, '+propName+', contains parenthesis and may be a function');
      console.warn("To sort a helper function, visit Meteor-Tabular's Github page");
    }
    // If acceptable, add to queue
    if (typeof propNames[0] === 'string'
      && orderable !== false) {
      sort.push([propNames[0], ord.dir]);
    }
  });

  return sort;
};

// Given an array of columns containing multiple classes, create an
// array where each column has a singular query, so that a column
// relying on multiple fields due to a collection helper, can be
// searched and sorted
Util.parseMultiFieldColumns = function parseMultiFieldColumns(columns) {
  // Run a short quality check to ensure a correct input
  if (!Array.isArray(columns)) {
    if (typeof(columns.class) === 'string'
      && typeof(columns.query) === 'string') {
      // Transform into an array:
      columns = [columns];
      console.warn('Warning: Expected first argument of parseMultiFieldColumns() to be an array, but continued anyway.');
    } else {
      console.error('First argument to parseMultiFieldColumns() did not contain the appropriate fields.');
    }
  }

  // Force new array insertion rather than reference to changing array
  function UpdateQuery(ColClass, col) {
    var temp = _.clone(col);
    temp.query = ColClass;
    columns.push(temp);
    // Alternatively (not optimal, but useful):
    // var temp = JSON.parse(JSON.stringify(col));
    // Link: http://stackoverflow.com/a/10869248/3219667
  }

  // iterate through each space-separated term in the class string
  _.each(columns, function (col) {
    if (typeof(col.class) === 'string') {
      var ColClasses = col.class.split(' ');
      if (ColClasses.length > 1) {
        _.each(ColClasses, function (ColClass) {
          UpdateQuery(ColClass, col);
        });
        // Now remove the original column with multiple classes and no formatted (single) query
        columns = _.filter(columns, function(item) {
          return item.query !== undefined && (item.query !== col.class || item.class !== col.class);
        });
      }
    }
  });
  return columns;
};


Util.createRegExp = function createRegExp(field, searchTerm) {
  // console.log('field');
  // console.log(field);
  // console.log(typeof(field) === 'object');
  // console.log(typeof(searchTerm) === 'string');
  var Query = '';
  if (Array.isArray(field)) {
    console.error('First argument must be an object, not an array.');
    return searchTerm;
  }
  if (typeof(field) === 'object' && typeof(searchTerm) === 'string') {
    // Using extended object, create a potentially complex regexp, or just use a basic search term
    if (typeof(field.options) === 'object'
      && !_.isEmpty(field.options)
      && field.options.regex !== undefined) {
      // If multiple queries, select the appropriate regular expression
      if (field.class.split(' ').length > 1) {
        var RegexIndex = field.class.split(' ').indexOf(field.data)
        var regex = field.options.regex[RegexIndex];
        // console.log('Multi-line RegexIndex');
        // console.log(regex);
      } else {
        var regex = field.options.regex;
      }
      // Check for user error in entering regex as a string
      if (typeof(regex) === 'string') {
        console.warn('Regex must be called as an array for expected behavior');
        Query = regex+searchTerm;
      } else if (regex[0] === null) {
        Query = searchTerm;
      } else {
        // If additional constraint on search in provided:
        if (typeof(regex[3]) === 'number') {
          if (searchTerm.length > regex[3]) {
            return '^@&&@&&@&&@&&@&&@&&@'; // this shouldn't match something in your database...
          }
        }
        // If second term of the regular expression array exists,
        // assume user wants an elastic search where search term characters
        // need only be in chronological order and not in direct succession
        if (typeof(regex[1]) === 'string') {
          searchTerm = searchTerm.replace(/(.)/g, '$1'+regex[1]);
        }
        // Likewise, confirm that the array has a third value in the regex array
        // Only useful if not using an elastic search
        if (typeof(regex[2]) === 'string') {
          searchTerm = searchTerm+regex[2];
        }
        // Create query:
        Query = regex[0] + searchTerm;
      }
    } else {
      Query = searchTerm;
    }
  } else {
    console.warn('createRegExp expects an (object, string), where object.options.regex is an array');
  }
  return Query;
}

Util.createMongoDBQuery = function createMongoDBQuery(selector, searchString, searchColumns, searchCaseInsensitive, columns) {
  // See if we can resolve the search string to a number,
  // in which case we use an extra query because $regex
  // matches string fields only.
  var searches = [];

  // Originally:
  // searchFields = _.isEmpty(searchColumns) ? searchFields : searchColumns;
  // But expanded to:
  if (_.isEmpty(searchColumns)) {
    if (!Array.isArray(columns)) {
      console.error('createMongoDBQuery() - columns must be an array');
    }
    // normalize search fields array to mirror the structure
    // as passed by the datatables ajax.data function
    var searchFields = _.map(columns, function(col) {
      return {
        data: col.query,
        search: {
          value: searchString
        },
        class: col.class,
        options: col.options
      };
    });
  } else {
    if (!Array.isArray(searchColumns)) {
      console.error('createMongoDBQuery() - searchColumns must be an array');
    }
    if (!_.isEmpty(columns)) {
      console.warn('You can only call either the 3rd or 5th argument at a time. Using the 3rd argument instead.');
    }
    // If the call for this function already specifies data in the
    // above searchFields format, use the user-supplied data
    var searchFields = searchColumns;
  }

  _.each(searchFields, function(field) {
    var searchValue = field.search.value || '';

    // Split and OR by whitespace, as per default DataTables search behavior
    if (field.options !== undefined
      && field.options !== null
      && field.options.SplitBy !== undefined) {
      searchValue = searchValue.split(field.options.SplitBy)
    } else {
      searchValue = searchValue.match(/\S+/g);
    }

    _.each(searchValue, function (searchTerm) {
      var m1 = {}, m2 = {};

      m1[field.data] = { $regex: Util.createRegExp(field, searchTerm) };

      // DataTables searches are case insensitive by default
      if (searchCaseInsensitive !== false) {
        m1[field.data].$options = "i";
      }

      searches.push(m1);

      // Doesn't work yet:
      // // Number search
      // var numSearchString = Number(searchTerm);
      // if (!isNaN(numSearchString)) {
      //   m2[field.data] = numSearchString;
      //   searches.push(m2);
      // }
    });
  });

  var result;
  console.log('result');
  console.log(result);
  if (selector === null || selector === undefined) {
    result = {$or: searches};
  } else {
    result = {$and: [selector, {$or: searches}]};
  }
  return result;
}



Util.getPubSelector = function getPubSelector(selector, searchString, searchFields, searchCaseInsensitive, columns) {

  // Address multiple classes by creating multiple "columns" with each query
  columns = Util.parseMultiFieldColumns(columns, null);

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // if search was invoked via .columns().search(), build a query off that
  // https://datatables.net/reference/api/columns().search()
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  var searchColumns = _.filter(columns, function(column) {
    return column.search && column.search.value !== '';
  });

  // required args
  if ((!searchString && searchColumns.length === 0) || !searchFields || searchFields.length === 0) {
    return selector;
  }

  // Create MongoDB Query
  var result = Util.createMongoDBQuery(selector, searchString, searchColumns, searchCaseInsensitive, columns);

  // Very useful for debugging and creating your own selectors
  // console.log('Result of getPubSelector:');
  // console.log(result);

  return result;
};
