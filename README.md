aldeed:tabular
=========================

A Meteor package that creates reactive [DataTables](http://datatables.net/) in an efficient way, allowing you to display the contents of enormous collections without impacting app performance.

* Fast: Uses an intelligent automatic data subscription so that table data is not loaded until it's needed and is cached in the browser after that.
* Reactive: As your collection data changes, so does your table.
* Customizable: Anything you can do with the DataTables library is supported, and you can provide your own publish function to build custom tables or tables than join data from two collections.

Although this appears similar to the [jquery-datatables](https://github.com/LumaPictures/meteor-jquery-datatables) Meteor package, there are actually many differences:

* This package is updated to work with Meteor 1.0+.
* This package has a much smaller codebase and includes less of the DataTables library.
* This package allows you to specify a Spacebars template as a cell's content.
* This package handles the reactive table updates in a different way.
* This package is designed to work with Twitter Bootstrap 3

## Installation

```bash
$ meteor add aldeed:tabular
```

## Example

Define your table in common code:

```js
TabularTables = {};

Meteor.isClient && Template.registerHelper('TabularTables', TabularTables);

TabularTables.Books = new Tabular.Table({
  name: "BookList",
  collection: Books,
  columns: [
    {data: "title", title: "Title"},
    {data: "author", title: "Author"},
    {data: "copies", title: "Copies Available"},
    {
      data: "lastCheckedOut",
      title: "Last Checkout",
      render: function (val, type, doc) {
        if (val instanceof Date) {
          return moment(val).calendar();
        } else {
          return "Never";
        }
      }
    },
    {data: "summary", title: "Summary"},
    {
      tmpl: Meteor.isClient && Template.bookCheckOutCell
    }
  ]
});
```

And then reference in one of your templates where you want it to appear:

```html
{{> tabular table=TabularTables.Books class="table table-striped table-bordered table-condensed"}}
```

Or add a [Mongo-style selector](https://docs.meteor.com/#/full/selectors) for a table that displays only one part of a collection:

```html
{{> tabular table=TabularTables.Books selector=selector class="table table-striped table-bordered table-condensed"}}
```

```js
Template.myTemplate.helpers({
  selector: function () {
    return {author: "Agatha Christie"};
  }
});
```

Other than `name`, 'pub', and `collection`, all options passed to the `Tabular.Table` constructor are used as options when constructing the DataTable. See the [DataTables documentation](http://datatables.net/reference/option/).

## Template Cells

You might have noticed this column definition in the example:

```js
{
  tmpl: Meteor.isClient && Template.bookCheckOutCell
}
```

This is not part of the DataTables API. It's a special feature of this package. By passing a Spacebars Template object, that template will be rendered in the table cell. You can include a button and/or use helpers and events. In your template and helpers, `this` is set to the document for the current row. Here's an example of how you might do the `bookCheckOutCell` template:

HTML:

```html
<template name="bookCheckOutCell">
  <button type="button" class="btn btn-xs check-out">Check Out</button>
</template>
```

Client JavaScript:

```js
Template.bookCheckOutCell.events({
  'click .check-out': function () {
    addBookToCheckoutCart(this._id);
  }
});
```

## Searching

If your table includes the global search/filter field, it will work and will update results in a manner that remains fast even with large collections. By default, all columns are searched if they can be. If you don't want a column to be searched, add the `searchable: false` option on that column.

If your table has a `selector` that already limits the results, the search happens within the selector results (i.e., your selector and the search selector are merged with an AND relationship).

## Security

The built-in document publication will provide any documents and fields that your table requests, which could be a security issue. You may set an `allow` option in your TabularTable definition to add some security checks. Set it to a function which will be passed a user ID and a list of fields or a selector. Return `false` if the given user should not have access to the requested fields.

Alternatively, you can provide your own publish function, as described in the next section.

## Using a Custom Publish Function

You can set the `pub` option to the name of a publish function (e.g., `{pub: "tabular_Users"}`) if you want a table to use your own custom publish function. You might want to do this to do some more advanced security checks or to join data from multiple collections together into a single table. Your publish function must be written in a specific way:

* It must accept three arguments: `tableName`, `ids`, and `fields`
* It must publish all the documents where `_id` is in the `ids` array.
* It should publish only the fields listed in the `fields` object, if one is provided.

### Example

Suppose we want a table of feedback submitted by users, which is stored in an `AppFeedback` collection, but we also want to display the email address of the user in the table. We'll use a custom publish function along with the [reywood:publish-composite](https://atmospherejs.com/reywood/publish-composite) package to do this. Also, we'll limit it to admins.

*server/publish.js*

```js
Meteor.publishComposite("tabular_AppFeedback", function (tableName, ids, fields) {
  check(tableName, String);
  check(ids, [String]);
  check(fields, Match.Optional(Object));

  this.unblock(); // requires meteorhacks:unblock package

  return {
    find: function () {
      this.unblock(); // requires meteorhacks:unblock package

      // check for admin role with alanning:roles package
      if (!Roles.userIsInRole(this.userId, 'admin')) {
        return [];
      }

      return AppFeedback.find({_id: {$in: ids}}, {fields: fields});
    },
    children: [
      {
        find: function(feedback) {
          this.unblock(); // requires meteorhacks:unblock package
          // Publish the related user
          return Meteor.users.find({_id: feedback.userId}, {limit: 1, fields: {emails: 1}, sort: {_id: 1}});
        }
      }
    ]
  };
});
```

*common/helpers.js*

```js
// Define an email helper on AppFeedback documents using dburles:collection-helpers package.
// We'll reference this in our table columns with "email()"
AppFeedback.helpers({
  email: function () {
    var user = Meteor.users.findOne({_id: this.userId});
    return user && user.emails[0].address;
  }
});
```

*common/tables.js*

```js
TabularTables.AppFeedback = new Tabular.Table({
  name: "AppFeedback",
  collection: AppFeedback,
  pub: "tabular_AppFeedback",
  order: [[0, "desc"]],
  columns: [
    {data: "date", title: "Date"},
    {data: "email()", title: "Email"},
    {data: "feedback", title: "Feedback"},
    {
      tmpl: Meteor.isClient && Template.appFeedbackCellDelete
    }
  ]
});
```
