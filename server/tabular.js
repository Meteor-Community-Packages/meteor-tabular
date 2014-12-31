/* global check, Match, Meteor, tablesByName, _ */

Meteor.publish("tabular_genericPub", function (tableName, ids, fields) {
  check(tableName, String);
  check(ids, Array);
  check(fields, Match.Optional(Object));

  var table = tablesByName[tableName];
  if (!table) {
    this.ready();
    return;
  }

  //check security function
  if (table.allow && !table.allow(this.userId, fields)) {
    this.ready();
    return;
  }

  return table.collection.find({_id: {$in: ids}}, {fields: fields});
});
//
//Meteor.methods({
//    "tabular_getInfo": function (tableName, selector, sort, skip, limit) {
//        var table = tablesByName[tableName];
//        if (!table) {
//            return;
//        }
//
//        this.unblock();
//
//        //check security function
//        if (table.allow && !table.allow(this.userId, selector)) {
//            return;
//        }
//
//        var filtered = table.collection.find(selector || {}, {
//            sort: sort,
//            skip: skip,
//            limit: limit
//        });
//
//        var recordsFiltered = filtered.count();
//
//        filtered = filtered.map(function (doc) {
//            return doc._id;
//        });
//
//        return {
//            ids: filtered,
//            recordsTotal: recordsFiltered,
//            recordsFiltered: recordsFiltered
//        };
//    }
//});

Meteor.publish("tabular_getInfo", function(tableName, selector, sort, skip, limit) {
  var self = this;

  var table = tablesByName[tableName];
  if (!table) {
    throw new Error('No TabularTable defined with the name "' + tableName + '". Make sure you are defining your TabularTable in common code.');
  }

  selector = selector || {};

  check(tableName, String);
  check(selector, Match.Optional(Object));
  check(sort, Array);
  check(skip, Number);
  check(limit, Number);

  // TODO check security

  selector = selector || {};

  var filteredCursor = table.collection.find(selector, {
    sort: sort,
    skip: skip,
    limit: limit,
    fields: {_id: 1}
  });

  var filteredRecordCount = filteredCursor.count();

  var filteredRecordIds = filteredCursor.map(function (doc) {
    return doc._id;
  });

  var recordReady = false;
  function updateRecords() {
    var record = {
      ids: filteredRecordIds,
      recordsTotal: filteredRecordCount,
      recordsFiltered: filteredRecordCount
    };

    if (recordReady) {
      console.log("changed", tableName, record);
      self.changed('tabular_records', tableName, record);
    } else {
      console.log("added", tableName, record);
      self.added("tabular_records", tableName, record);
      recordReady = true;
    }
  }

  var initializing = true;
  var handle = filteredCursor.observeChanges({
    added: function (id) {
      if (initializing) {
        return;
      }

      console.log("ADDED");
      filteredRecordCount++;
      filteredRecordIds.push(id);
      updateRecords();
    },
    removed: function (id) {
      console.log("REMOVED");
      filteredRecordCount--;
      filteredRecordIds = _.without(filteredRecordIds, id);
      updateRecords();
    }
  });

  initializing = false;

  updateRecords();
  self.ready();

  // Stop observing the cursor when client unsubs.
  // Stopping a subscription automatically takes
  // care of sending the client any removed messages.
  self.onStop(function () {
    handle.stop();
  });
});

//Meteor.publish("tabular_genericPub", function(tableName, selector, sort, skip, limit, fields) {
//  var self = this;
//
//  var table = tablesByName[tableName];
//  if (!table) {
//    throw new Error('No TabularTable defined with the name "' + tableName + '". Make sure you are defining your TabularTable in common code.');
//  }
//
//  check(tableName, String);
//  check(selector, Match.Optional(Object));
//  check(sort, Array);
//  check(skip, Number);
//  check(limit, Number);
//  check(fields, Match.Optional(Object));
//
//  selector = selector || {};
//
//  // check security
//  if (table.allow && !table.allow(self.userId, selector)) {
//    self.ready();
//    return;
//  }
//
//  var record = {
//    // current count of all documents
//    recordsTotal: table.collection.find({}, {
//      fields: fields
//    }).count(),
//
//    // current count of filtered documents
//    recordsFiltered: table.collection.find(selector, {
//      fields: fields
//    }).count()
//  };
//
//  // cursor for visible documents on table
//  var visibleCursor = table.collection.find(selector, {
//    sort: sort,
//    skip: skip,
//    limit: limit,
//    fields: fields
//  });
//
//  var recordReady = false;
//  var updateRecords = function() {
//    if (!recordReady) {
//      return;
//    }
//    self.changed('tabular_records', tableName, record);
//  };
//
//  // We will skip {{recordsTotal}} documents and
//  // we will observe added and removed only after this publication initialized
//  // if we start counting from 0 we would count 1.000.000 documents if there were 1.000.000 documents in this collection
//  // we definitely don't want that
//  var totalHandle = table.collection.find({}, {
//    skip: record.recordsTotal
//  }).observe({
//    added: function() {
//      record.recordsTotal++;
//      updateRecords();
//    },
//    removed: function() {
//      record.recordsTotal--;
//      updateRecords();
//    }
//  });
//
//  // track filtered doc count
//  var filteredHandle = table.collection.find(selector, {
//    skip: record.recordsFiltered
//  }).observe({
//    added: function() {
//      record.recordsFiltered++;
//      updateRecords();
//    },
//    removed: function() {
//      record.recordsFiltered--;
//      updateRecords();
//    }
//  });
//
//  // track visible documents and update client
//  var visibleHandle = visibleCursor.observeChanges({
//    added: function(id, fields, before) {
//      self.added(table.collection._name, id, fields);
//    },
//    changed: function(id, fields) {
//      self.changed(table.collection._name, id, fields);
//    },
//    removed: function(id) {
//      self.removed(table.collection._name, id);
//    }
//  });
//
//  // insert record doc to the client-side records collection
//  recordReady = true;
//  self.added("tabular_records", tableName, record);
//  self.ready();
//
//  self.onStop(function() {
//    // stop all observer handles
//    visibleHandle.stop();
//    totalHandle.stop();
//    filteredHandle.stop();
//  });
//
//});
