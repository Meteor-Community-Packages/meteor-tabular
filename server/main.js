import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';
import Tabular from '../common/Tabular';

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

Meteor.publish('tabular_genericPub', function (tableName, ids, fields) {
  check(tableName, String);
  check(ids, Array);
  check(fields, Match.Optional(Object));

  const table = Tabular.tablesByName[tableName];
  if (!table) {
    // We throw an error in the other pub, so no need to throw one here
    this.ready();
    return;
  }

  // Check security. We call this in both publications.
  if (typeof table.allow === 'function' && !table.allow(this.userId, fields)) {
    this.ready();
    return;
  }

  // Check security for fields. We call this only in this publication
  if (typeof table.allowFields === 'function' && !table.allowFields(this.userId, fields)) {
    this.ready();
    return;
  }

  return table.collection.find({_id: {$in: ids}}, {fields: fields});
});

Meteor.publish('tabular_getInfo', function (tableName, selector, sort, skip, limit) {
  check(tableName, String);
  check(selector, Match.Optional(Match.OneOf(Object, null)));
  check(sort, Match.Optional(Match.OneOf(Array, null)));
  check(skip, Number);
  check(limit, Match.Optional(Match.OneOf(Number, null)));

  const table = Tabular.tablesByName[tableName];
  if (!table) {
    throw new Error(`No TabularTable defined with the name "${tableName}". Make sure you are defining your TabularTable in common code.`);
  }

  // Check security. We call this in both publications.
  // Even though we're only publishing _ids and counts
  // from this function, with sensitive data, there is
  // a chance someone could do a query and learn something
  // just based on whether a result is found or not.
  if (typeof table.allow === 'function' && !table.allow(this.userId)) {
    this.ready();
    return;
  }

  selector = selector || {};

  // Allow the user to modify the selector before we use it
  if (typeof table.changeSelector === 'function') {
    selector = table.changeSelector(selector, this.userId);
  }

  // Apply the server side selector specified in the tabular
  // table constructor. Both must be met, so we join
  // them using $and, allowing both selectors to have
  // the same keys.
  if (typeof table.selector === 'function') {
    const tableSelector = table.selector(this.userId);
    if (_.isEmpty(selector)) {
      selector = tableSelector;
    } else {
      selector = {$and: [tableSelector, selector]};
    }
  }

  const findOptions = {
    skip: skip,
    fields: {_id: 1}
  };

  // `limit` may be `null`
  if (limit > 0) {
    findOptions.limit = limit;
  }

  // `sort` may be `null`
  if (_.isArray(sort)) {
    findOptions.sort = sort;
  }

  const filteredCursor = table.collection.find(selector, findOptions);

  let filteredRecordIds = filteredCursor.map(doc => doc._id);

  // If we are not going to count for real, in order to improve performance, then we will fake
  // the count to ensure the Next button is always available.
  const fakeCount = filteredRecordIds.length + skip + 1;

  const countCursor = table.collection.find(selector, {fields: {_id: 1}});

  let recordReady = false;
  let updateRecords = () => {
    let currentCount;
    if (!table.skipCount) {
      if (typeof table.alternativeCount === 'function') {
        currentCount = table.alternativeCount(selector);
      } else {
        currentCount = countCursor.count();
      }
    }

    // From https://datatables.net/manual/server-side
    // recordsTotal: Total records, before filtering (i.e. the total number of records in the database)
    // recordsFiltered: Total records, after filtering (i.e. the total number of records after filtering has been applied - not just the number of records being returned for this page of data).

    const record = {
      ids: filteredRecordIds,
      // count() will give us the updated total count
      // every time. It does not take the find options
      // limit into account.
      recordsTotal: table.skipCount ? fakeCount : currentCount,
      recordsFiltered: table.skipCount ? fakeCount : currentCount
    };

    if (recordReady) {
      //console.log('changed', tableName, record);
      this.changed('tabular_records', tableName, record);
    } else {
      //console.log('added', tableName, record);
      this.added('tabular_records', tableName, record);
      recordReady = true;
    }
  }

  if (table.throttleRefresh) {
    // Why Meteor.bindEnvironment? See https://github.com/aldeed/meteor-tabular/issues/278#issuecomment-217318112
    updateRecords = _.throttle(Meteor.bindEnvironment(updateRecords), table.throttleRefresh);
  }

  updateRecords();

  this.ready();

  // Handle docs being added or removed from the result set.
  let initializing = true;
  const handle = filteredCursor.observeChanges({
    added: function (id) {
      if (initializing) return;

      //console.log('ADDED');
      filteredRecordIds.push(id);
      updateRecords();
    },
    removed: function (id) {
      //console.log('REMOVED');
      // _.findWhere is used to support Mongo ObjectIDs
      filteredRecordIds = _.without(filteredRecordIds, _.findWhere(filteredRecordIds, id));
      updateRecords();
    }
  });
  initializing = false;

  // It is too inefficient to use an observe without any limits to track count perfectly
  // accurately when, for example, the selector is {} and there are a million documents.
  // Instead we will update the count every 10 seconds, in addition to whenever the limited
  // result set changes.
  const interval = Meteor.setInterval(updateRecords, 10000);

  // Stop observing the cursors when client unsubs.
  // Stopping a subscription automatically takes
  // care of sending the client any removed messages.
  this.onStop(() => {
    Meteor.clearInterval(interval);
    handle.stop();
  });
});

export default Tabular;
