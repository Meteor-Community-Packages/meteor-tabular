/* global _, Template, Tabular, Blaze, cleanFieldName, ReactiveVar, Meteor */

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
  template.tabular.limit = new ReactiveVar(0);
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
      // Update limit
      template.tabular.limit.set(data.length);
      // Update order
      template.tabular.order.set(data.order);
      // Update searchString
      template.tabular.searchString.set((data.search && data.search.value) || null);

      //Tracker.flush();

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
    var tabularTable = data && data.table;

    if (!(tabularTable instanceof Tabular.Table)) {
      throw new Error("You must pass Tabular.Table instance as the table attribute");
    }

    // We care only about hot swapping the table attribute.
    // For anything else, we ignore it.
    if (tabularTable.name === lastTableName) {
      return;
    }
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
        col.data = null;
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

        dataProp = cleanFieldName(dataProp);
        fields[dataProp] = 1;

        // DataTables says default value for col.searchable is `true`,
        // so we will search on all columns that haven't been set to
        // `false`.
        if (col.searchable !== false) {
          searchFields.push(dataProp);
        }
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
    var sort = _.map(order, function (ord) {
      var propName = columns[ord.column].data;
      return [propName, ord.dir];
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
  template.autorun(function () {
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
    var options = _.extend({}, ajaxOptions, userOptions);

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

    console.log("tableInfo", tableInfo);

    Meteor.subscribe(
      template.tabular.docPub.get(),
      tableName,
      tableInfo.ids || [],
      template.tabular.fields.get()
    );
  });

  template.autorun(function () {
    var tableName = template.tabular.tableName.get();
    var tableInfo = Tabular.getRecord(tableName);
    var collection = template.tabular.collection.get();

    if (!collection || !tableInfo) {
      return;
    }

    var findOptions = {};
    var fields = template.tabular.fields.get();
    if (fields) {
      findOptions.fields = fields;
    }

    var sort = template.tabular.sort.get();
    if (sort) {
      findOptions.sort = sort;
    }

    var cursor = collection.find({_id: {$in: tableInfo.ids}}, findOptions);

    template.tabular.data = cursor.fetch();

    // tell DataTables to call the ajax function again
    console.log("reload table");
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
