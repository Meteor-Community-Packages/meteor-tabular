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

        collection = tabularTable.collection;

        pub = tabularTable.pub;

        // Build the list of field names we want included
        // based on the provided columns object
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

            var prop = col.data;
            if (typeof prop !== "string")
                return;

            // for field names with a dot, we just need
            // the top level field name
            var dot = prop.indexOf(".");
            if (dot !== -1) {
                prop = prop.slice(0, dot);
            }

            fields[prop] = 1;
        });

        // Add default options
        options = _.extend({
            serverSide: true,
            ajax: function (data, callback, settings) {
                var skip = data.start,
                    limit = data.length,
                    sort;

                sort = _.map(data.order, function (ord) {
                    var propName = columns[ord.column].data;
                    return [propName, ord.dir];
                });

                Meteor.call("tabular_getInfo", tabularTable.name, selector, sort, skip, limit, function (error, result) {
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