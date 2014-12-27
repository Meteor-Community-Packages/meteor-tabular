Template.tabular.helpers({
    atts: function () {
        // We remove the "table" and "selector" attributes and assume the rest belong
        // on the <table> element
        return _.omit(this, "table", "selector");
    }
});

Template.tabular.rendered = function () {
  var template = this, table, $tableElement = template.$('table');
  var tabularTable = null;

  // We put this all in a reactive computation so that the component args,
  // such as the selector, can reactively change and the table will adjust.
  template.autorun(function () {
    var collection, pub, fields, selector, columns, options, searchFields = [];
    var data = Template.currentData();
    tabularTable = data && data.table;

    if (!(tabularTable instanceof Tabular.Table)) {
        throw new Error("You must pass Tabular.Table instance as the table attribute");
    }

    columns = _.clone(tabularTable.options.columns);

    selector = data.selector || {};

    collection = tabularTable.collection;

    pub = tabularTable.pub;

    fields = {}; // fields option for passing to `find` later

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
        col.createdCell = function(cell, cellData, rowData) {
          Blaze.renderWithData(tmpl, rowData, cell);
        }
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

    // These are some DataTables options that we need for everything to work.
    // We add them to the options specified by the user.
    options = _.extend({
      // tell DataTables that we're getting the table data from a server
      serverSide: true,
      // define the function that DataTables will call upon first load and whenever
      // we tell it to reload data, such as when paging, etc.
      ajax: function (data, callback, settings) {
        var skip = data.start,
            limit = data.length,
            searchString = data.search && data.search.value,
            caseInsensitive = tabularTable.options && tabularTable.options.search && tabularTable.options.search.caseInsensitive,
            currentSelector = _.clone(selector),
            sort;

        if (searchString) {
          var searches = _.map(searchFields, function(field) {
            var m = {};
            m[field] = {$regex: searchString};
            // DataTables searches are case insensitive by default
            if (caseInsensitive !== false) {
              m[field]["$options"] = "-i";
            }
            return m;
          });
          if (searches.length) {
            _.extend(currentSelector, {$or: searches});
          }
        }

        // TODO support the nested arrays format for sort
        // and ignore instance functions like "foo()"
        sort = _.map(data.order, function (ord) {
            var propName = columns[ord.column].data;
            return [propName, ord.dir];
        });

        // First we call a server method that will give us back an array of
        // _ids that should be on the current page of the table, plus some aggregate
        // numbers that DataTables needs in order to show the paging.
        Meteor.call("tabular_getInfo", tabularTable.name, currentSelector, sort, skip, limit, function (error, result) {
          if (error) {

          } else {

            // Subscribe to the documents with _ids given to us. Limit the
            // fields to only those we need to display.
            Meteor.subscribe(pub, tabularTable.name, result.ids, fields, function () {

              // We now do the `find` call inside an autorun computation,
              // which will allow us to trigger a table reload whenever any
              // of the documents currently being shown are updated.
              Tracker.autorun(function (c) {

                // Get the cursor for the `find` results
                var cursor = collection.find({_id: {$in: result.ids}}, {
                  fields: fields,
                  sort: sort
                });

                // Pass the data to DataTables
                if (c.firstRun) {
                  callback({
                    draw: data.draw,
                    recordsTotal: result.recordsTotal,
                    recordsFiltered: result.recordsFiltered,
                    data: cursor.fetch()
                  });
                }

                // Or if it's the second time we're running, that means
                // that one of the displayed documents has changed, so we
                // stop this autorun computation and tell DataTables to
                // reload the table. That will cause it to call this `ajax`
                // function again.
                else {
                  c.stop();
                  table.ajax.reload(null, false);
                }
              }); // end Tracker.autorun
            }); // end Meteor.subscribe
          } // end else
        }); // end Meteor.call

      }
    }, tabularTable.options);

    if (!table) {
      // We start with an empty table. The observe below
      // will populate the data.
      table = $tableElement.DataTable(options);
    } else {
      table.clear().draw();
    }

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

function cleanFieldName(field) {
  // for field names with a dot, we just need
  // the top level field name
  var dot = field.indexOf(".");
  if (dot !== -1) {
    field = field.slice(0, dot);
  }

  // If it's referencing an array, strip off the brackets
  field = field.split('[')[0];

  return field;
}
