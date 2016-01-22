/* global Tabular, Mongo */

// We are creating a named client Collection that we will only modify from server
Tabular.tableRecords = new Mongo.Collection('tabular_records');
Tabular.remoteTableRecords = [];

Tabular.getRecord = function(name, collection) {
  if (collection && collection._connection)
    return Tabular.getRemoteRecord(name, collection._connection);
  return Tabular.tableRecords.findOne(name);
};

Tabular.getRemoteRecord = function(name, connection) {
  var remote = _.find(Tabular.remoteTableRecords, function (remote) {
    return remote.connection === connection;
  });
  if (!remote) {
    var len = Tabular.remoteTableRecords.push({
      connection: connection,
      tableRecords: new Mongo.Collection('tabular_records', {connection: connection})
    });
    remote = Tabular.remoteTableRecords[len - 1];
  }
  return remote.tableRecords.findOne(name);
};
