Meteor.publish("tabular_genericPub", function (tableName, ids, fields) {
    check(tableName, String);
    check(ids, Array);
    check(fields, Match.Optional(Object));

    var table = tablesByName[tableName];
    if (!table) {
        throw new Error('No TabularTable defined with the name "' + tableName + '". Make sure you are defining your TabularTable in common code.');
    }

    //check security function
    if (table.allow && !table.allow(this.userId, fields)) {
        this.ready();
        return;
    }

    return table.collection.find({_id: {$in: ids}}, {fields: fields});
});

Meteor.methods({
    "tabular_getInfo": function (tableName, selector, sort, skip, limit) {
        var table = tablesByName[tableName];
        if (!table) {
            throw new Error('No TabularTable defined with the name "' + tableName + '". Make sure you are defining your TabularTable in common code.');
        }

        this.unblock();

        //check security function
        if (table.allow && !table.allow(this.userId, selector)) {
            return;
        }

        var filtered = table.collection.find(selector || {}, {
            sort: sort,
            skip: skip,
            limit: limit
        });

        var recordsFiltered = filtered.count();

        filtered = filtered.map(function (doc) {
            return doc._id;
        });

        return {
            ids: filtered,
            recordsTotal: recordsFiltered,
            recordsFiltered: recordsFiltered
        };
    }
});
