/* global _, Template, Tabular, Blaze, Util, ReactiveVar, Session, Meteor, tablesByName */

Template.tabular.helpers({
  atts: function () {
    // We remove the "table" and "selector" attributes and assume the rest belong
    // on the <table> element
    return _.omit(this, "table", "selector");
  }
});

Template.tabular.rendered = function () {
  var template = this, table, $tableElement = template.$('table');

  template.tabular = {};
  template.tabular.selector = new ReactiveVar({});
  template.tabular.pubSelector = new ReactiveVar({});
  template.tabular.skip = new ReactiveVar(0);
  template.tabular.limit = new ReactiveVar(10);
  template.tabular.order = new ReactiveVar(null, function (oldVal, newVal) {
    if (oldVal === newVal) {
      return true;
    }
    var areSame = false;
    if (_.isArray(oldVal) && _.isArray(newVal)) {
      areSame = _.every(newVal, function (obj, i) {
        return _.isEqual(obj, oldVal[i]);
      });
    }
    return areSame;
  });
  template.tabular.sort = new ReactiveVar(null);
  template.tabular.columns = new ReactiveVar(null);
  template.tabular.fields = new ReactiveVar(null);
  template.tabular.searchString = new ReactiveVar(null);
  template.tabular.searchFields = new ReactiveVar(null);
  template.tabular.searchCaseInsensitive = new ReactiveVar(true);
  template.tabular.tableName = new ReactiveVar(null);
  template.tabular.options = new ReactiveVar({});
  template.tabular.docPub = new ReactiveVar(null);
  template.tabular.collection = new ReactiveVar(null);
  template.tabular.ready = new ReactiveVar(false);
  template.tabular.data = [];
  template.tabular.recordsTotal = 0;
  template.tabular.recordsFiltered = 0;

  // These are some DataTables options that we need for everything to work.
  // We add them to the options specified by the user.
  var ajaxOptions = {
    // tell DataTables that we're getting the table data from a server
    serverSide: true,
    // define the function that DataTables will call upon first load and whenever
    // we tell it to reload data, such as when paging, etc.
    ajax: function (data, callback/*, settings*/) {
      // Update skip
      template.tabular.skip.set(data.start);
      Session.set('Tabular.LastSkip', data.start);
      // Update limit
      template.tabular.limit.set(data.length);
      // Update order
      template.tabular.order.set(data.order);
      // Update searchString
      template.tabular.searchString.set((data.search && data.search.value) || null);

      // We're ready to subscribe to the data.
      // Matters on the first run only.
      template.tabular.ready.set(true);

      callback({
        draw: data.draw,
        recordsTotal: template.tabular.recordsTotal,
        recordsFiltered: template.tabular.recordsFiltered,
        data: template.tabular.data
      });
    }
  };

  // React to selector changes
  template.autorun(function () {
    var data = Template.currentData();
    if (!data) {
      return;
    }
    template.tabular.selector.set(data.selector);
  });

  // Reactively determine table columns, fields, and searchFields.
  // This will rerun whenever the current template data changes,
  // but we will do something only when the `table` attribute
  // changes.
  var lastTableName;
  template.autorun(function () {
    var data = Template.currentData();

    // We get the current TabularTable instance, and cache it on the
    // template instance for access elsewhere
    var tabularTable = template.tabular.tableDef = data && data.table;

    if (!(tabularTable instanceof Tabular.Table)) {
      throw new Error("You must pass Tabular.Table instance as the table attribute");
    }

    // We care only about hot swapping the table attribute.
    // For anything else, we ignore it.
    if (tabularTable.name === lastTableName) {
      return;
    }

    // If we reactively changed the `table` attribute, run
    // onUnload for the previous table
    if (lastTableName !== undefined) {
      var lastTableDef = tablesByName[lastTableName];
      if (lastTableDef && typeof lastTableDef.onUnload === 'function') {
        lastTableDef.onUnload();
      }
    }

    // Cache this table name as the last table name for next run
    lastTableName = tabularTable.name;

    var columns = _.clone(tabularTable.options.columns);
    var fields = {}, searchFields = [];

    // Loop through the provided columns object
    _.each(columns, function (col) {
      // The `tmpl` column option is special for this
      // package. We parse it into other column options
      // and then remove it.
      var tmpl = col.tmpl;
      if (tmpl) {
        col.defaultContent = "";
        col.orderable = false;
        col.createdCell = function (cell, cellData, rowData) {
          Blaze.renderWithData(tmpl, rowData, cell);
        };
        delete col.tmpl;
      }

      // Automatically protect against errors from null and undefined
      // values
      if (!("defaultContent" in col)) {
        col.defaultContent = "";
      }

      // Build the list of field names we want included
      var dataProp = col.data;
      if (typeof dataProp === "string") {
        // If it's referencing an instance function, don't
        // include it. Prevent sorting and searching because
        // our pub function won't be able to do it.
        if (dataProp.indexOf("()") !== -1) {
          col.sortable = false;
          col.searchable = false;
          return;
        }

        fields[Util.cleanFieldName(dataProp)] = 1;

        // DataTables says default value for col.searchable is `true`,
        // so we will search on all columns that haven't been set to
        // `false`.
        if (col.searchable !== false) {
          searchFields.push(Util.cleanFieldNameForSearch(dataProp));
        }
      }

      // If we're displaying a template for this field,
      // don't pass the data prop along to DataTables.
      // This prevents both the data and the template
      // from displaying in the same cell. We wait until
      // now to do this to be sure that we still include
      // the data prop in the list of fields.
      if (tmpl) {
        col.data = null;
      }
    });

    template.tabular.columns.set(columns);
    template.tabular.fields.set(fields);
    template.tabular.searchFields.set(searchFields);
    template.tabular.searchCaseInsensitive.set((tabularTable.options && tabularTable.options.search && tabularTable.options.search.caseInsensitive) || false);
    template.tabular.options.set(tabularTable.options);
    template.tabular.tableName.set(tabularTable.name);
    template.tabular.docPub.set(tabularTable.pub);
    template.tabular.collection.set(tabularTable.collection);
  });

  // Reactively determine sort. We take the DataTables
  // `order` format and convert it into a mongo sort
  // array.
  template.autorun(function () {
    var order = template.tabular.order.get();
    var columns = template.tabular.columns.get();
    if (!order || !columns) {
      return;
    }

    // TODO support the nested arrays format for sort
    // and ignore instance functions like "foo()"
    var sort = [];
    _.each(order, function (ord) {
      var propName = columns[ord.column].data;
      if (typeof propName === 'string') {
        sort.push([propName, ord.dir]);
      }
    });

    template.tabular.sort.set(sort);
  });

  // React to selector and search changes to create the
  // selector that we use to subscribe.
  template.autorun(function () {
    var selector = template.tabular.selector.get();
    var searchString = template.tabular.searchString.get();
    var searchFields = template.tabular.searchFields.get();
    var searchCaseInsensitive = template.tabular.searchCaseInsensitive.get();

    if (!searchString || !searchFields || searchFields.length === 0) {
      template.tabular.pubSelector.set(selector);
      return;
    }

    var searches = _.map(searchFields, function(field) {
      var m = {};
      m[field] = {$regex: searchString};
      // DataTables searches are case insensitive by default
      if (searchCaseInsensitive !== false) {
        m[field].$options = "i";
      }
      return m;
    });

    template.tabular.pubSelector.set(_.extend({}, selector, {$or: searches}));
  });

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

    Meteor.subscribe(
      "tabular_getInfo",
      template.tabular.tableName.get(),
      template.tabular.pubSelector.get(),
      template.tabular.sort.get(),
      template.tabular.skip.get(),
      template.tabular.limit.get()
    );
  });

  // Build the table. We rerun this only when the table
  // options specified by the user changes, which should be
  // only when the `table` attribute changes reactively.
  template.autorun(function () {
    var userOptions = template.tabular.options.get();
    var options = _.extend({
      // unless the user provides her own displayStart,
      // we use a value from Session. This keeps the
      // same page selected after a hot code push.
      displayStart: Session.get('Tabular.LastSkip')
    }, ajaxOptions, userOptions);

    // After the first time, we need to destroy before rebuilding.
    if (table) {
      var dt = $tableElement.DataTable();
      if (dt) {
        dt.destroy();
      }
    }

    // We start with an empty table. Data will be populated by ajax function.
    table = $tableElement.DataTable(options);
  });

  // Reactively subscribe to the documents with _ids given to us. Limit the
  // fields to only those we need to display. It's not necessary to call stop
  // on subscriptions that are within autorun computations.
  template.autorun(function () {
    // tableInfo is reactive and causes a rerun whenever the
    // list of docs that should currently be in the table changes.
    // It does not cause reruns based on the documents themselves
    // changing.
    var tableName = template.tabular.tableName.get();
    var tableInfo = Tabular.getRecord(tableName) || {};

    template.tabular.recordsTotal = tableInfo.recordsTotal || 0;
    template.tabular.recordsFiltered = tableInfo.recordsFiltered || 0;

    // In some cases, there is no point in subscribing to nothing
    if (_.isEmpty(tableInfo) ||
        template.tabular.recordsTotal === 0 ||
        template.tabular.recordsFiltered === 0) {
      return;
    }

    //console.log("tableInfo", tableInfo);

    template.tabular.tableDef.sub.subscribe(
      template.tabular.docPub.get(),
      tableName,
      tableInfo.ids || [],
      template.tabular.fields.get()
    );
  });

  template.autorun(function () {
    // Rerun when the `table` attribute changes
    var tableName = template.tabular.tableName.get();
    // Or when the requested list of records changes,
    // such as when paging, searching, etc.
    var tableInfo = Tabular.getRecord(tableName);
    // Get the collection that we're showing in the table
    var collection = template.tabular.collection.get();

    if (!collection || !tableInfo) {
      return;
    }

    // Build options object to pass to `find`.
    // It's important that we use the same options
    // that were used in generating the list of `_id`s
    // on the server.
    var findOptions = {};
    var fields = template.tabular.fields.get();
    if (fields) {
      findOptions.fields = fields;
    }

    var sort = template.tabular.sort.get();
    if (sort) {
      findOptions.sort = sort;
    }

    // Get the updated list of docs we should be showing
    var cursor = collection.find({_id: {$in: tableInfo.ids}}, findOptions);

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

    // Get the data as an array, for consumption by DataTables
    // in the ajax function.
    template.tabular.data = cursor.fetch();

    // Tell DataTables to call the ajax function again
    table.ajax.reload(null, false);
  });

  // clean up after ourselves XXX not working
  // need beforeDestroyed callback
  // see https://github.com/meteor/meteor/issues/2141
//  this.firstNode._uihooks = {
//    removeElement: function (node, done) {
//      console.log("table cleanup");
//      if ($.fn.DataTable.fnIsDataTable(node)) {
//        var dt = $(node).DataTable();
//        console.log("dt", dt);
//        dt && dt.destroy();
//      }
//    }
//  };
};

Template.tabular.destroyed = function () {
  // Run a user-provided onUnload function
  if (this.tabular &&
      this.tabular.tableDef &&
      typeof this.tabular.tableDef.onUnload === 'function') {
    this.tabular.tableDef.onUnload();
  }
};
