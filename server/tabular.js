Meteor.publish("tabular_genericPub", function(tableName, selector, sort, skip, limit, fields) {
  var self = this;

  var table = tablesByName[tableName];
  if (!table) {
    throw new Error('No TabularTable defined with the name "' + tableName + '". Make sure you are defining your TabularTable in common code.');
  }

  check(tableName, String);
  check(selector, Match.Optional(Object));
  check(sort, Array);
  check(skip, Number);
  check(limit, Number);
  check(fields, Match.Optional(Object));

  console.log('sub with ', selector, sort, skip, limit, fields);

  var table = tablesByName[tableName];
  if (!table) {
    self.ready();
    return;
  }

  // check security
  if (table.allow && !table.allow(self.userId, selector)) {
    self.ready();
    return;
  }

  // cursor for whole collection
  var totalCursor = table.collection.find({}, {
    fields: fields
  });

  // cursor for filtered documents without any skip or limit
  var filteredCursor = table.collection.find(selector || {}, {
    fields: fields
  });

  // cursor for visible documents on table
  var visibleCursor = table.collection.find(selector || {}, {
    sort: sort,
    skip: skip,
    limit: limit,
    fields: fields
  });

  var record = {
    recordsFiltered: 0,
    recordsTotal: 0
  };

  // TODO : dont forget to debounce this fn, first check if meteor already debounces changed events
  var recordReady = false;
  var updateRecords = function() {
    if (!recordReady) {
      return;
    }
    self.changed('tabular_records', tableName, record);
  };

  // track total doc count
  var totalHandle = totalCursor.observe({
    added: function() {
      record.recordsTotal++;
      updateRecords();
    },
    removed: function() {
      record.recordsTotal--;
      updateRecords();
    }
  });

  // track filtered doc count
  var filteredHandle = filteredCursor.observe({
    added: function() {
      record.recordsFiltered++;
      updateRecords();
    },
    removed: function() {
      record.recordsFiltered--;
      updateRecords();
    }
  });

  // track visible documents and update client
  var visibleHandle = visibleCursor.observeChanges({
    added: function(id, fields, before) {
      self.added(table.collection._name, id, fields);
    },
    changed: function(id, fields) {
      self.changed(table.collection._name, id, fields);
    },
    removed: function(id) {
      self.removed(table.collection._name, id);
    }
  });

  // insert record doc to the client-side records collection
  recordReady = true;
  self.added("tabular_records", tableName, record);
  self.ready();

  self.onStop(function() {
    // stop all observer handles
    visibleHandle.stop();
    totalHandle.stop();
    filteredHandle.stop();
  });

});