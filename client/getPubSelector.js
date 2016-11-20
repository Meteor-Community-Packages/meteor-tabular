import { _ } from 'meteor/underscore';

function getPubSelector(
    selector,
    searchString,
    searchFields,
    searchCaseInsensitive,
    splitSearchByWhitespace,
    columns,
    tableColumns,
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
    tableColumns,
  );
}

function createMongoSearchQuery(
  selector,
  searchString,
  searchColumns,
  searchCaseInsensitive,
  splitSearchByWhitespace,
  columns,
  tableColumns,
) {
  // See if we can resolve the search string to a number,
  // in which case we use an extra query because $regex
  // matches string fields only.
  const searches = [];

  _.each(searchColumns, field => {
    // Get the column options from the Tabular.Table so we can check search options
    const column = _.findWhere(tableColumns, { data: field.data });
    const exactSearch = column && column.search && column.search.exact;
    const numberSearch = column && column.search && column.search.isNumber;

    let searchValue = field.search.value || '';

    // Split and OR by whitespace, as per default DataTables search behavior
    if (splitSearchByWhitespace && !exactSearch) {
      searchValue = searchValue.match(/\S+/g);
    } else {
      searchValue = [searchValue];
    }

    _.each(searchValue, searchTerm => {
      const m1 = {};

      // String search
      if (exactSearch) {
        if (numberSearch) {
          const searchTermAsNumber = Number(searchTerm);
          if (!isNaN(searchTermAsNumber)) {
            searches.push({ [field.data]: searchTermAsNumber });
          } else {
            searches.push({ [field.data]: searchTerm });
          }
        } else {
          searches.push({ [field.data]: searchTerm });
        }
      } else {
        const searchObj = { $regex: searchTerm };

        // DataTables searches are case insensitive by default
        if (searchCaseInsensitive !== false) searchObj.$options = 'i';

        searches.push({ [field.data]: searchObj });

        // For backwards compatibility, we do non-exact searches as a number, too,
        // even if isNumber isn't true
        const searchTermAsNumber = Number(searchTerm);
        if (!isNaN(searchTermAsNumber)) {
          searches.push({ [field.data]: searchTermAsNumber });
        }
      }
    });
  });

  let result;
  if (typeof selector === 'object' && selector !== null) {
    result = {$and: [selector, {$or: searches}]};
  } else if (searches.length > 1) {
    result = {$or: searches};
  } else {
    result = searches[0] || {};
  }

  return result;
}

export default getPubSelector;
