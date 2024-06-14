import './tabular.html';

/* global _, Blaze, Tracker, ReactiveVar, Session, Meteor, */
import { $ } from 'meteor/jquery';
//This is a bit shit that we're initialising this explicit version within the library
import 'datatables.net-bs5';

import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import Tabular from '../common/Tabular';
import tableInit from './tableInit';
import getPubSelector from './getPubSelector';
import { getMongoSort, objectsAreEqual, sortsAreEqual } from '../common/util';

//dataTableInit(window, $);
Template.registerHelper('TabularTables', Tabular.tablesByName);
Tabular.tableRecords = new Mongo.Collection('tabular_records');
Tabular.remoteTableRecords = [];

Tabular.getTableRecordsCollection = function (connection) {
  if (!connection || connection === Tabular.tableRecords._connection) {
    return Tabular.tableRecords;
  }

  let remote = _.find(Tabular.remoteTableRecords, (remote) => remote.connection === connection);
  if (!remote) {
    remote = {
      connection,
      tableRecords: new Mongo.Collection('tabular_records', { connection })
    };
    Tabular.remoteTableRecords.push(remote);
  }
  return remote.tableRecords;
};

Tabular.getRecord = function (name, collection) {
  return Tabular.getTableRecordsCollection(collection._connection).findOne(name);
};

Template.tabular.helpers({
  atts() {
    // We remove the "table" and "selector" attributes and assume the rest belong
    // on the <table> element
    return _.omit(this, 'table', 'selector');
  }
});

Template.tabular.onRendered(function () {
  const template = this;
  template.$tableElement = template.$('table');
  let table;
  let resetTablePaging = false;

  template.tabular = {};
  template.tabular.data = [];
  template.tabular.pubSelector = new ReactiveVar({}, objectsAreEqual);
  template.tabular.skip = new ReactiveVar(0);
  template.tabular.limit = new ReactiveVar(10);
  template.tabular.sort = new ReactiveVar(null, sortsAreEqual);
  template.tabular.columns = null;
  template.tabular.fields = null;
  template.tabular.searchFields = null;
  template.tabular.searchCaseInsensitive = true;
  template.tabular.splitSearchByWhitespace = true;
  template.tabular.tableName = new ReactiveVar(null);
  template.tabular.options = new ReactiveVar({}, objectsAreEqual);
  template.tabular.docPub = new ReactiveVar(null);
  template.tabular.collection = new ReactiveVar(null);
  template.tabular.connection = null;
  template.tabular.ready = new ReactiveVar(false);
  template.tabular.recordsTotal = 0;
  template.tabular.recordsFiltered = 0;
  template.tabular.isLoading = new ReactiveVar(true);
  template.tabular.blazeViews = [];
  template.tabular.searchTerm = new ReactiveVar(this.data.searchTerm || null);

  // These are some DataTables options that we need for everything to work.
  // We add them to the options specified by the user.
  const ajaxOptions = {
    // tell DataTables that we're getting the table data from a server
    serverSide: true,
    processing: true,
    // define the function that DataTables will call upon first load and whenever
    // we tell it to reload data, such as when paging, etc.
    ajax: function (data, callback /*, settings*/) {
      // When DataTables requests data, first we set
      // the new skip, limit, order, and pubSelector values
      // that DataTables has requested. These trigger
      // the first subscription, which will then trigger the
      // second subscription.

      //console.log( 'data', data, 'template.tabular.data', template.tabular.data );

      // Update skip
      template.tabular.skip.set(data.start);
      Session.set('Tabular.LastSkip', data.start);

      // Update limit
      let options = template.tabular.options.get();
      let hardLimit = options && options.limit;
      if (data.length === -1) {
        if (hardLimit === undefined) {
          console.warn(
            'When using no paging or an "All" option with tabular, it is best to also add a hard limit in your table options like {limit: 500}'
          );
          template.tabular.limit.set(null);
        } else {
          template.tabular.limit.set(hardLimit);
        }
      } else {
        template.tabular.limit.set(data.length);
      }

      // Update sort
      template.tabular.sort.set(getMongoSort(data.order, options.columns));

      // Update pubSelector
      let pubSelector = template.tabular.selector;
      //if we're using the searchCustom functionality don't do the default client side regex via getPubSelector
      if (!template.tabular.tableDef.searchCustom) {
        pubSelector = getPubSelector(
          template.tabular.selector,
          (data.search && data.search.value) || null,
          template.tabular.searchFields,
          template.tabular.searchCaseInsensitive,
          template.tabular.splitSearchByWhitespace,
          data.columns || null,
          options.columns
        );
      }
      template.tabular.pubSelector.set(pubSelector);

      // We're ready to subscribe to the data.
      // Matters on the first run only.
      template.tabular.ready.set(true);

      //console.log('ajax');
      //console.debug( 'calling ajax callback with', template.tabular.data );

      callback({
        draw: data.draw,
        recordsTotal: template.tabular.recordsTotal,
        recordsFiltered: template.tabular.recordsFiltered,
        data: template.tabular.data
      });
    },
    initComplete: function () {
      // Fix THOMAS modified 24.11.2021
      // Fix the case of multiple table on the same page
      const tableId = template.data.id;
      const options = template.tabular.options.get();
      if (options.search && options.search.onEnterOnly) {
        const replaceSearchLabel = function (newText) {
          $('#' + tableId + '_filter label')
            .contents()
            .filter(function () {
              return this.nodeType === 3 && this.textContent.trim().length;
            })
            .replaceWith(newText);
        };
        $('#' + tableId + '_filter input')
          .unbind()
          .bind('keyup change', function (event) {
            if (!table) return;
            if (event.keyCode === 13 || this.value === '') {
              replaceSearchLabel(table.i18n('search'));
              table.search(this.value).draw();
            } else {
              replaceSearchLabel(table.i18n('Press enter to filter'));
            }
          });
      }
    },
    headerCallback(headerRow) {
      const options = template.tabular.options.get();
      const columns = options.columns;

      $(headerRow)
        .find('td,th')
        .each((index, headerCell) => {
          const titleFunction = columns[index] && columns[index].titleFn;
          if (typeof titleFunction === 'function') {
            headerCell.innerHTML = '';
            if (headerCell.__blazeViewInstance) {
              Blaze.remove(headerCell.__blazeViewInstance);
            }
            const view = new Blaze.View(titleFunction);
            headerCell.__blazeViewInstance = Blaze.render(view, headerCell);
          }
        });
    }
  };

  // For testing
  //setUpTestingAutoRunLogging(template);

  // Reactively determine table columns, fields, and searchFields.
  // This will rerun whenever the current template data changes.
  let lastTableName;
  template.autorun(function () {
    let data = Template.currentData();

    //console.log('currentData autorun', data);

    // if we don't have data OR the selector didn't actually change return out
    if (!data || (data.selector && template.tabular.selector === data.selector)) {
      return;
    }

    // We get the current TabularTable instance, and cache it on the
    // template instance for access elsewhere
    let tabularTable = (template.tabular.tableDef = data.table);

    if (!(tabularTable instanceof Tabular.Table)) {
      throw new Error('You must pass Tabular.Table instance as the table attribute');
    }

    // Always update the selector reactively
    template.tabular.selector = data.selector;
    template.tabular.searchTerm.set(data.searchTerm || null);

    // The remaining stuff relates to changing the `table`
    // attribute. If we didn't change it, we can stop here,
    // but we need to reload the table if this is not the first
    // run
    if (tabularTable.name === lastTableName) {
      if (table) {
        // passing `false` as the second arg tells it to
        // reset the paging
        table.ajax.reload(null, true);
      }
      return;
    }

    // If we reactively changed the `table` attribute, run
    // onUnload for the previous table
    if (lastTableName !== undefined) {
      let lastTableDef = Tabular.tablesByName[lastTableName];
      if (lastTableDef && typeof lastTableDef.onUnload === 'function') {
        lastTableDef.onUnload();
      }
    }

    // Cache this table name as the last table name for next run
    lastTableName = tabularTable.name;

    // Figure out and update the columns, fields, and searchFields
    const columns = tableInit(tabularTable, template);

    // Set/update everything else
    template.tabular.searchCaseInsensitive = true;
    template.tabular.splitSearchByWhitespace = true;

    if (tabularTable.options && tabularTable.options.search) {
      if (tabularTable.options.search.caseInsensitive === false) {
        template.tabular.searchCaseInsensitive = false;
      }
      if (tabularTable.options.search.smart === false) {
        template.tabular.splitSearchByWhitespace = false;
      }
    }
    template.tabular.options.set({
      ...tabularTable.options,
      columns
    });
    template.tabular.tableName.set(tabularTable.name);
    template.tabular.docPub.set(tabularTable.pub);
    template.tabular.collection.set(tabularTable.collection);
    if (tabularTable.collection && tabularTable.collection._connection) {
      template.tabular.connection = tabularTable.collection._connection;
    }

    // userOptions rerun should do this?
    if (table) {
      // passing `true` as the second arg tells it to
      // reset the paging
      table.ajax.reload(null, true);
    }
  });

  template.autorun(() => {
    // these 5 are the parameters passed to "tabular_getInfo" subscription
    // so when they *change*, set the isLoading flag to true
    template.tabular.tableName.get();
    template.tabular.pubSelector.get();
    template.tabular.sort.get();
    template.tabular.skip.get();
    template.tabular.limit.get();
    template.tabular.isLoading.set(true);
    template.tabular.searchTerm.get();
  });

  // First Subscription
  // Subscribe to an array of _ids that should be on the
  // current page of the table, plus some aggregate
  // numbers that DataTables needs in order to show the paging.
  // The server will reactively keep this info accurate.
  // It's not necessary to call stop
  // on subscriptions that are within autorun computations.
  template.autorun(function () {
    if (!template.tabular.ready.get()) {
      return;
    }

    //console.log('tabular_getInfo autorun');

    function onReady() {
      template.tabular.isLoading.set(false);
    }

    let connection = template.tabular.connection;
    let context = connection || Meteor;
    context.subscribe(
      'tabular_getInfo',
      template.tabular.tableName.get(),
      template.tabular.pubSelector.get(),
      template.tabular.sort.get(),
      template.tabular.skip.get(),
      template.tabular.limit.get(),
      template.tabular.searchTerm.get(),
      onReady
    );
  });

  // Second Subscription
  // Reactively subscribe to the documents with _ids given to us. Limit the
  // fields to only those we need to display. It's not necessary to call stop
  // on subscriptions that are within autorun computations.
  template.autorun(function () {
    // tableInfo is reactive and causes a rerun whenever the
    // list of docs that should currently be in the table changes.
    // It does not cause reruns based on the documents themselves
    // changing.
    let tableName = template.tabular.tableName.get();
    let collection = template.tabular.collection.get();
    let tableInfo = Tabular.getRecord(tableName, collection) || {};

    //console.log('tableName and tableInfo autorun', tableName, tableInfo);

    template.tabular.recordsTotal = tableInfo.recordsTotal || 0;
    template.tabular.recordsFiltered = tableInfo.recordsFiltered || 0;

    // In some cases, there is no point in subscribing to nothing
    if (
      _.isEmpty(tableInfo) ||
      template.tabular.recordsTotal === 0 ||
      template.tabular.recordsFiltered === 0
    ) {
      return;
    }

    // Extend with extraFields from table definition
    let fields = template.tabular.fields;
    if (fields) {
      // Extend with extraFields from table definition
      if (typeof template.tabular.tableDef.extraFields === 'object') {
        fields = _.extend(_.clone(fields), template.tabular.tableDef.extraFields);
      }
    }

    template.tabular.tableDef.sub.subscribe(
      template.tabular.docPub.get(),
      tableName,
      tableInfo.ids || [],
      fields
    );
  });

  // Build the table. We rerun this only when the table
  // options specified by the user changes, which should be
  // only when the `table` attribute changes reactively.
  template.autorun((c) => {
    const userOptions = template.tabular.options.get();
    const options = _.extend({}, ajaxOptions, userOptions);

    //console.log('userOptions autorun', userOptions);

    // unless the user provides her own displayStart,
    // we use a value from Session. This keeps the
    // same page selected after a hot code push.
    if (c.firstRun && !('displayStart' in options)) {
      options.displayStart = Tracker.nonreactive(function () {
        return Session.get('Tabular.LastSkip');
      });
    }

    if (!('order' in options)) {
      options.order = [];
    }

    // After the first time, we need to destroy before rebuilding.
    if (table) {
      let dt = template.$tableElement.DataTable();
      if (dt) {
        dt.destroy();
      }
      template.$tableElement.empty();
    }

    // We start with an empty table.
    // Data will be populated by ajax function now.
    table = template.$tableElement.DataTable(options);

    if (options.buttonContainer) {
      const container = $(options.buttonContainer, table.table().container());
      table.buttons().container().appendTo(container);
    }
  });

  template.autorun(() => {
    // Get table name non-reactively
    let tableName = Tracker.nonreactive(function () {
      return template.tabular.tableName.get();
    });
    // Get the collection that we're showing in the table non-reactively
    let collection = Tracker.nonreactive(function () {
      return template.tabular.collection.get();
    });

    // React when the requested list of records changes.
    // This can happen for various reasons.
    // * DataTables reran ajax due to sort changing.
    // * DataTables reran ajax due to page changing.
    // * DataTables reran ajax due to results-per-page changing.
    // * DataTables reran ajax due to search terms changing.
    // * `selector` attribute changed reactively
    // * Docs were added/changed/removed by this user or
    //   another user, causing visible result set to change.
    let tableInfo = Tabular.getRecord(tableName, collection);
    if (!collection || !tableInfo) {
      return;
    }

    // Build options object to pass to `find`.
    // It's important that we use the same options
    // that were used in generating the list of `_id`s
    // on the server.
    let findOptions = {};
    let fields = template.tabular.fields;
    if (fields) {
      // Extend with extraFields from table definition
      if (typeof template.tabular.tableDef.extraFields === 'object') {
        _.extend(fields, template.tabular.tableDef.extraFields);
      }
      findOptions.fields = fields;
    }

    // Sort does not need to be reactive here; using
    // reactive sort would result in extra rerunning.
    let sort = Tracker.nonreactive(function () {
      return template.tabular.sort.get();
    });
    if (sort) {
      findOptions.sort = sort;
    }

    // Get the updated list of docs we should be showing
    let cursor = collection.find({ _id: { $in: tableInfo.ids } }, findOptions);

    //console.log('tableInfo, fields, sort, find autorun', cursor.count());
    //console.log( 'autorun: cursor.count', cursor.count(), 'tableInfo.ids.length', tableInfo.ids.length );

    // We're subscribing to the docs just in time, so there's
    // a good chance that they aren't all sent to the client yet.
    // We'll stop here if we didn't find all the docs we asked for.
    // This will rerun one or more times as the docs are received
    // from the server, and eventually we'll have them all.
    // Without this check in here, there's a lot of flashing in the
    // table as rows are added.
    if (cursor.count() < tableInfo.ids.length) {
      return;
    }
    // Get data as array for DataTables to consume in the ajax function
    template.tabular.data = cursor.fetch();

    if (template.tabular.blazeViews) {
      //console.log(`Removing ${template.blazeViews.length}`);
      template.tabular.blazeViews.forEach(view => {
        try {
          Blaze.remove(view);
        }
        catch(err) {
          console.error(err);
        }
      });
      template.tabular.blazeViews = [];
    }

    // For these types of reactive changes, we don't want to
    // reset the page we're on, so we pass `false` as second arg.
    // The exception is if we changed the results-per-page number,
    // in which cases `resetTablePaging` will be `true` and we will do so.
    if (table) {
      if (resetTablePaging) {
        table.ajax.reload(null, true);
        resetTablePaging = false;
      } else {
        table.ajax.reload(null, false);
      }
    }

    template.tabular.isLoading.set(false);
  });

  template.autorun(() => {
    const isLoading = template.tabular.isLoading.get();
    if (isLoading) {
      template.$('.dataTables_processing').show();
    } else {
      template.$('.dataTables_processing').hide();
    }
  });

  // force table paging to reset to first page when we change page length
  template.$tableElement.on('length.dt', function () {
    resetTablePaging = true;
  });
});

Template.tabular.onDestroyed(function () {
  // Clear last skip tracking
  Session.set('Tabular.LastSkip', 0);
  // Run a user-provided onUnload function
  if (
    this.tabular &&
    this.tabular.tableDef &&
    typeof this.tabular.tableDef.onUnload === 'function'
  ) {
    this.tabular.tableDef.onUnload();
  }

  if (this.tabular?.blazeViews) {
    //console.log(`Removing ${this.blazeViews.length}`);
    this.tabular.blazeViews.forEach(view => {
      try {
        Blaze.remove(view);
      }
      catch(err) {
        console.error(err);
      }
    });
    this.tabular.blazeViews = [];
  }

  // Destroy the DataTable instance to avoid memory leak
  if (this.$tableElement && this.$tableElement.length) {
    const dt = this.$tableElement.DataTable();
    if (dt) {
      dt.destroy();
    }
    this.$tableElement.empty();
  }
});

//function setUpTestingAutoRunLogging(template) {
//  template.autorun(function () {
//    var val = template.tabular.tableName.get();
//    console.log('tableName changed', val);
//  });
//
//  template.autorun(function () {
//    var val = template.tabular.pubSelector.get();
//    console.log('pubSelector changed', val);
//  });
//
//  template.autorun(function () {
//    var val = template.tabular.sort.get();
//    console.log('sort changed', val);
//  });
//
//  template.autorun(function () {
//    var val = template.tabular.skip.get();
//    console.log('skip changed', val);
//  });
//
//  template.autorun(function () {
//    var val = template.tabular.limit.get();
//    console.log('limit changed', val);
//  });
//}

export default Tabular;
