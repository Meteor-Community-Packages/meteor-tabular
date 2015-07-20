/* global getPubSelector:true, _ */

getPubSelector = function getPubSelector(selector, searchString, searchFields, searchCaseInsensitive, columns) {

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

  // See if we can resolve the search string to a number,
  // in which case we use an extra query because $regex
  // matches string fields only.
  var searches = [];

  // normalize search fields array to mirror the structure
  // as passed by the datatables ajax.data function
  searchFields = _.map(searchFields, function(field) {
    return {
      data: field,
      search: {
        value: searchString
      }
    };
  });

  var searchTerms = _.isEmpty(searchColumns) ? searchFields : searchColumns;

  _.each(searchTerms, function(field) {
    var m1 = {}, m2 = {};

    var numSearchString = Number(field.search.value);

    // String search
    m1[field.data] = { $regex: field.search.value };

    // DataTables searches are case insensitive by default
    if (searchCaseInsensitive !== false) {
      m1[field.data].$options = "i";
    }

    searches.push(m1);

    // Number search
    if (!isNaN(numSearchString)) {
      m2[field.data] = numSearchString;
      searches.push(m2);
    }
  });

  return {$and: [selector, {$or: searches}]};
};
