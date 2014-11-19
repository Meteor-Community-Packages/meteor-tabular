Template.tabular.helpers({
    atts: function () {
        // We remove the "table" and "selector" attributes and assume the rest belong
        // on the <table> element
        return _.omit(this, "table", "selector");
    }
});

Template.tabular.rendered = function () {
    var template = this, table, $tableElement = template.$('table');

    template.autorun(function () {
        var collection, pub, fields, selector, columns, options;
        var data = Template.currentData();
        var tabularTable = data && data.table;

        if (!(tabularTable instanceof Tabular.Table)) {
            throw new Error("You must pass Tabular.Table instance as the table attribute");
        }

        columns = _.clone(tabularTable.options.columns);

        selector = data.selector || {};

        searchfields = _.clone(tabularTable.options.searchfields);

        collection = tabularTable.collection;

        pub = tabularTable.pub;

        // Loop through the provided columns object
        fields = {};
        _.each(columns, function (col) {
            // Custom handling for `tmpl` column option
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
                // include it.
                if (dataProp.indexOf("()") === -1) {
                    // for field names with a dot, we just need
                    // the top level field name
                    var dot = dataProp.indexOf(".");
                    if (dot !== -1) {
                        dataProp = dataProp.slice(0, dot);
                    }
                    
                    // If it's referencing an array, strip off the brackets
                    dataProp = dataProp.split('[')[0];

                    fields[dataProp] = 1;
                }
                // If it's referencing an instance function,
                // prevent sorting because our pub function
                // won't be able to do it.
                else {
                    col.sortable = false;
                }
            }
        });

        // Add default options
        options = _.extend({
            serverSide: true,
            ajax: function (data, callback, settings) {
                var skip = data.start,
                    limit = data.length,
                    search = data.search.value,
                    sort;

                if (search) {
                    var searches = _.map(searchfields, function(f) { var m = {}; m[f] = {$regex: search}; return m; });
                    var searchselector = {$or: searches};
                } else {
                    var searchselector = selector;
                }

                // TODO support the nested arrays format for sort
                // and ignore instance functions like "foo()"
                sort = _.map(data.order, function (ord) {
                    var propName = columns[ord.column].data;
                    return [propName, ord.dir];
                });

                Meteor.call("tabular_getInfo", tabularTable.name, searchselector, sort, skip, limit, function (error, result) {
                    if (error) {

                    } else {

                        // Subscribe to the data as needed
                        Meteor.subscribe(pub, tabularTable.name, result.ids, fields, function () {
                            Tracker.autorun(function (c) {
                                var cursor = collection.find({_id: {$in: result.ids}}, {
                                    fields: fields,
                                    sort: sort
                                });

                                if (c.firstRun) {
                                    callback({
                                        draw: data.draw,
                                        recordsTotal: result.recordsTotal,
                                        recordsFiltered: result.recordsFiltered,
                                        data: cursor.fetch()
                                    });
                                } else {
                                    c.stop();
                                    table.ajax.reload(null, false);
                                }
                            });

                        });
                    }
                });

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
};
