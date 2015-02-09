/* global check, Match, Meteor, tablesByName, _ */

/*
 * These are the two publications used by TabularTable.
 *
 * The genericPub one can be overridden by supplying a `pub`
 * property with a different publication name. This publication
 * is given only the list of ids and requested fields. You may
 * want to override it if you need to publish documents from
 * related collections along with the table collection documents.
 *
 * The getInfo one runs first and handles all the complex logic
 * required by this package, so that you don't have to duplicate
 * this logic when overriding the genericPub function.
 *
 * Having two publications also allows fine-grained control of
 * reactivity on the client.
 */

Meteor.publish("tabular_genericPub", function (tableName, ids, fields) {
  var self = this;

  check(tableName, String);
  check(ids, Array);
  check(fields, Match.Optional(Object));

  var table = tablesByName[tableName];
  if (!table) {
    // We throw an error in the other pub, so no need to throw one here
    self.ready();
    return;
  }

  // Extend fields list with extra fields from the table definition
  if (table.extraFields) {
    _.extend(fields, table.extraFields);
  }

  // Check security. We call this in both publications.
  if (typeof table.allow === 'function' && !table.allow(self.userId, fields)) {
    self.ready();
    return;
  }

  // Check security for fields. We call this only in this publication
  if (typeof table.allowFields === 'function' && !table.allowFields(self.userId, fields)) {
    self.ready();
    return;
  }

  return table.collection.find({_id: {$in: ids}}, {fields: fields});
});

Meteor.publish("tabular_getInfo", function(tableName, selector, sort, skip, limit) {
  var self = this;

  check(tableName, String);
  check(selector, Match.Optional(Match.OneOf(Object, null)));
  check(sort, Match.Optional(Match.OneOf(Array, null)));
  check(skip, Number);
  check(limit, Number);

  var table = tablesByName[tableName];
  if (!table) {
    throw new Error('No TabularTable defined with the name "' + tableName + '". Make sure you are defining your TabularTable in common code.');
  }

  // Verify that limit is not 0, because that will actually
  // publish all document _ids.
  if (limit === 0) {
    limit = 1;
  }

  // Check security. We call this in both publications.
  // Even though we're only publishing _ids and counts
  // from this function, with sensitive data, there is
  // a chance someone could do a query and learn something
  // just based on whether a result is found or not.
  if (typeof table.allow === 'function' && !table.allow(self.userId)) {
    self.ready();
    return;
  }

  selector = selector || {};

  // Apply the server side selector specified in the tabular
  // table constructor. Both must be met, so we join
  // them using $and, allowing both selectors to have
  // the same keys.
  if (typeof table.selector === 'function') {
    var tableSelector = table.selector(self.userId);
    if (_.isEmpty(selector)) {
      selector = tableSelector;
    } else {
      selector = {$and: [tableSelector, selector]};
    }
  }

  var findOptions = {
    skip: skip,
    limit: limit,
    fields: {_id: 1}
  };

  // `sort` may be `null`
  if (_.isArray(sort)) {
    findOptions.sort = sort;
  }

  var filteredCursor = table.collection.find(selector, findOptions);

  var filteredRecordIds = filteredCursor.map(function (doc) {
    return doc._id;
  });

  var countCursor = table.collection.find(selector);

  var recordReady = false;
  function updateRecords() {
    var currentCount = countCursor.count();

    var record = {
      ids: filteredRecordIds,
      // count() will give us the updated total count
      // every time. It does not take the find options
      // limit into account.
      recordsTotal: currentCount,
      recordsFiltered: currentCount
    };

    if (recordReady) {
      //console.log("changed", tableName, record);
      self.changed('tabular_records', tableName, record);
    } else {
      //console.log("added", tableName, record);
      self.added("tabular_records", tableName, record);
      recordReady = true;
    }
  }

  // Handle docs being added or removed from the result set.
  var initializing1 = true;
  var handle1 = filteredCursor.observeChanges({
    added: function (id) {
      if (initializing1) {
        return;
      }

      //console.log("ADDED");
      filteredRecordIds.push(id);
      updateRecords();
    },
    removed: function (id) {
      //console.log("REMOVED");
      filteredRecordIds = _.without(filteredRecordIds, id);
      updateRecords();
    }
  });
  initializing1 = false;

  // Handle docs being added or removed from the non-limited set.
  // This allows us to get total count available.
  var initializing2 = true;
  var handle2 = countCursor.observeChanges({
    added: function () {
      if (initializing2) {
        return;
      }
      updateRecords();
    },
    removed: function () {
      updateRecords();
    }
  });
  initializing2 = false;

  updateRecords();
  self.ready();

  // Stop observing the cursors when client unsubs.
  // Stopping a subscription automatically takes
  // care of sending the client any removed messages.
  self.onStop(function () {
    handle1.stop();
    handle2.stop();
  });
});
