import { _ } from 'meteor/underscore';

function getPubSelector(
    selector,
    searchString,
    searchFields,
    searchCaseInsensitive,
    splitSearchByWhitespace,
    columns
  ) {

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // if search was invoked via .columns().search(), build a query off that
  // https://datatables.net/reference/api/columns().search()
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  let searchColumns = _.filter(columns, column => {
    return column.search && column.search.value !== '';
  });

  // required args
  if ((!searchString && searchColumns.length === 0) || !searchFields || searchFields.length === 0) {
    return selector;
  }

  if (searchColumns.length === 0) {
    // normalize search fields array to mirror the structure
    // as passed by the datatables ajax.data function
    searchColumns = _.map(searchFields, field => {
      return {
        data: field,
        search: {
          value: searchString
        }
      };
    });
  }

  return createMongoSearchQuery(
    selector,
    searchString,
    searchColumns,
    searchCaseInsensitive,
    splitSearchByWhitespace,
    columns,
  );
}

function createMongoSearchQuery(
  selector,
  searchString,
  searchColumns,
  searchCaseInsensitive,
  splitSearchByWhitespace,
  columns,
) {
  // See if we can resolve the search string to a number,
  // in which case we use an extra query because $regex
  // matches string fields only.
  const searches = [];

  _.each(searchColumns, field => {
    let searchValue = field.search.value || '';

    // Split and OR by whitespace, as per default DataTables search behavior
    if (splitSearchByWhitespace) {
      searchValue = searchValue.match(/\S+/g);
    } else {
      searchValue = [searchValue];
    }

    _.each(searchValue, searchTerm => {
      const m1 = {};
      const m2 = {};

      // String search
      m1[field.data] = { $regex: searchTerm };

      // DataTables searches are case insensitive by default
      if (searchCaseInsensitive !== false) {
        m1[field.data].$options = 'i';
      }

      searches.push(m1);

      // Number search
      const numSearchString = Number(searchTerm);
      if (!isNaN(numSearchString)) {
        m2[field.data] = numSearchString;
        searches.push(m2);
      }
    });
  });

  let result;
  if (typeof selector === 'object' && selector !== null) {
    result = {$and: [selector, {$or: searches}]};
  } else {
    result = {$or: searches};
  }

  return result;
}

export default getPubSelector;
