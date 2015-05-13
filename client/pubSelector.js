/* global getPubSelector:true, _ */

getPubSelector = function getPubSelector(selector, searchString, searchFields, searchCaseInsensitive) {
    if (!searchString || !searchFields || searchFields.length === 0) {
      return selector;
    }

    // See if we can resolve the search string to a number,
    // in which case we use an extra query because $regex
    // matches string fields only.
    var numSearchString = Number(searchString), searches = [];

    _.each(searchFields, function(field) {
      var m1 = {}, m2 = {};

      // String search
      m1[field] = {$regex: searchString};
      // DataTables searches are case insensitive by default
      if (searchCaseInsensitive !== false) {
        m1[field].$options = "i";
      }
      searches.push(m1);

      // Number search
      if (!isNaN(numSearchString)) {
        m2[field] = numSearchString;//{$where: '/' + numSearchString + '/.test(this.' + field + ')'};
        searches.push(m2);
      }
    });

    return {$and: [selector, {$or: searches}]};
  };
