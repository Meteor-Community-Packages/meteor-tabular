aldeed:tabular
=========================

A Meteor package that creates reactive [DataTables](http://datatables.net/) in an efficient way, allowing you to display the contents of enormous collections without impacting app performance.

* Fast: Uses an intelligent automatic data subscription so that table data is not loaded until it's needed.
* Reactive: As your collection data changes, so does your table. You can also reactively update the query selector if you provide your own filter buttons outside of the table.
* Customizable: Anything you can do with the DataTables library is supported, and you can provide your own publish function to build custom tables or tables than join data from two collections.
* Hot Code Push Ready: Remains on the same data page after a hot code push.

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

## Online Demo App

View a [demonstration project on Meteorpad](http://meteorpad.com/pad/xNafF9N5XJNrFJEyG/TabularDemo).

## Example

Define your table in common code:

```js
TabularTables = {};

TabularTables.Books = new Tabular.Table({
  name: "Books",
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

The `TabularTables.Books` helper is automatically added, where "Books" is the `name` option from your table constructor.

## Displaying Only Part of a Collection's Data Set

Add a [Mongo-style selector](https://docs.meteor.com/#/full/selectors) to your `tabular` component for a table that displays only one part of a collection:

```html
{{> tabular table=TabularTables.Books selector=selector class="table table-striped table-bordered table-condensed"}}
```

```js
Template.myTemplate.helpers({
  selector: function () {
    return {author: "Agatha Christie"}; // this could be pulled from a Session var or something that is reactive
  }
});
```

If you want to limit what is published to the client for security reasons you can provide a selector in the constructor which will be used by the publications. Selectors provided this way will be combined with selectors provided to the template using an AND relationship. Both selectors may query on the same fields if necessary.

```js
TabularTables.Books = new Tabular.Table({
  // other properties...
  selector: function( userId ) {
    return { documentOwner: userId }
  }
});
```

## Passing Options to the DataTable

The [DataTables documentation](http://datatables.net/reference/option/) lists a huge variety of available table options and callbacks. You may add any of these to your `Tabular.Table` constructor options and they will be used as options when constructing the DataTable.

Example:

```js
TabularTables.Books = new Tabular.Table({
  // other properties...
  createdRow: function( row, data, dataIndex ) {
    // set row class based on row data
  }
});
```

## Template Cells

You might have noticed this column definition in the example:

```js
{
  tmpl: Meteor.isClient && Template.bookCheckOutCell
}
```

This is not part of the DataTables API. It's a special feature of this package. By passing a Blaze Template object, that template will be rendered in the table cell. You can include a button and/or use helpers and events.

In your template and helpers, `this` is set to the document for the current row by default. If you need more information in your template context, such as which column it is for a shared template, you can set `tmplContext` to a function which takes the row data as an argument and returns the context, like this:

```js
{
  data: 'title',
  title: "Title",
  tmpl: Meteor.isClient && Template.sharedTemplate,
  tmplContext: function (rowData) {
    return {
      item: rowData,
      column: 'title'
    };
  }
}
```

*Note: The `Meteor.isClient && ` is there because tables must be defined in common code, which runs on the server and client. But the `Template` object is not defined in server code, so we need to prevent errors by setting `tmpl` only on the client.*

The `tmpl` option can be used with or without the `data` option.

Here's an example of how you might do the `bookCheckOutCell` template:

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

When you enter multiple search terms separated by whitespace, they are searched with an OR condition, which matches default DataTables behavior.

If your table has a `selector` that already limits the results, the search happens within the selector results (i.e., your selector and the search selector are merged with an AND relationship).

## Using Collection Helpers

The DataTables library supports calling functions on the row data by appending your `data` string with `()`. This can be used along with the `dburles:collection-helpers` package (or your own collection transform). For example:

*Relevant part of your table definition:*

```js
columns: [
  {data: "fullName()", title: "Full Name"},
]
```

*A collection helper you've defined in client or common code:*

```js
People.helpers({
  fullName: function () {
    return this.firstName + ' ' + this.lastName;
  }
});
```

Note that for this to work properly, you must ensure that the `firstName` and `lastName` fields are published. If they're included as the `data` for other columns, then there is no problem. If not, you can use the `extraFields` option or your own custom publish function.

## Publishing Extra Fields

If your table's templates or helper functions require fields that are not included in the data, you can tell Tabular to publish these fields by including them in the `extraFields` array option:

```js
TabularTables.People = new Tabular.Table({
  // other properties...
  extraFields: ['firstName', 'lastName']
});
```

## Modifying the Selector

If your table requires the selector to be modified before it's published, you can modify it with the `changeSelector` method. This can be useful for modifying what will be returned in a search. It's called only on the server.

```js
TabularTables.Posts = new Tabular.Table({
  // other properties...
  changeSelector: function(selector, userId) {
    // modify it here ...
    return selector;
  }
});
```


## Security

You can optionally provide an `allow` and/or `allowFields` function to control which clients can get the published data. These are used by the built-in publications on the server only.

```js
TabularTables.Books = new Tabular.Table({
  // other properties...
  allow: function (userId) {
    return false; // don't allow this person to subscribe to the data
  },
  allowFields: function (userId, fields) {
    return false; // don't allow this person to subscribe to the data
  }
});
```

*Note: Every time the table data changes, you can expect `allow` to be called 1 or 2 times and `allowFields` to be called 0 or 1 times. If the table uses your own custom publish function, then `allow` will be called 1 time and `allowFields` will never be called.*

If you need to be sure that certain fields are never published or if different users can access different fields, use `allowFields`. Otherwise just use `allow`.

## Caching the Documents

By default, a normal `Meteor.subscribe` is used for the current page's table data. This subscription is stopped and a new one replaces it whenever you switch pages. This means that if your table shows 10 results per page, your client collection will have 10 documents in it on page 1. When you switch to page 2, your client collection will still have only 10 documents in it, but they will be the next 10.

If you want to override this behavior such that documents displayed in the table remain cached on the client for some time, you can add the `meteorhacks:subs-manager` package to your app and set the `sub` option on your `Tabular.Table`. This can make the table a bit faster and reduce unnecessary subscription traffic, but may not be a good idea if the data is extremely sensitive.

```js
TabularTables.Books = new Tabular.Table({
  // other properties...
  sub: new SubsManager()
});
```

## Hooks

Currently there is only one hook provided: `onUnload`

## Using a Custom Publish Function

This package takes care of publication and subscription for you using two built-in publications. The first publication determines the list of document `_id`s that
are needed by the table. This is a complex publication and there should be no need to override it. The second publication publishes the actual documents with those `_id`s.

The most common reason to override the second publication with your own custom one is to publish documents from related collections at the same time.

To tell Tabular to use your custom publish function, pass the publication name as the `pub` option. Your function:

* must accept and check three arguments: `tableName`, `ids`, and `fields`
* must publish all the documents where `_id` is in the `ids` array.
* should publish only the fields listed in the `fields` object, if one is provided.
* should do any necessary security checks
* may also publish other data necessary for your table

### Example

Suppose we want a table of feedback submitted by users, which is stored in an `AppFeedback` collection, but we also want to display the email address of the user in the table. We'll use a custom publish function along with the [reywood:publish-composite](https://atmospherejs.com/reywood/publish-composite) package to do this. Also, we'll limit it to admins.

*server/publish.js*

```js
Meteor.publishComposite("tabular_AppFeedback", function (tableName, ids, fields) {
  check(tableName, String);
  check(ids, Array);
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
  allow: function (userId) {
    // check for admin role with alanning:roles package
    return Roles.userIsInRole(userId, 'admin');
  },
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

## Tips

Some useful tips

### Get the DataTable instance

```js
var dt = $(theTableElement).DataTable();
```

### Detect row clicks and get row data

```js
Template.myTemplate.events({
  'click tbody > tr': function (event) {
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
  }
});
```

### Search in one column

```js
var dt = $(theTableElement).DataTable();
var indexOfColumnToSearch = 0;
dt.column(indexOfColumnToSearch).search('search terms').draw();
```

### Adjust column widths

By default, the DataTables library uses automatic column width calculations. If this makes some of your columns look squished, try setting the `autoWidth: false` option.

### Turning Off Paging or Showing "All"

When using no paging or an "All" (-1) option in the page limit list, it is best to also add a hard limit in your table options like `limit: 500`, unless you know the collection will always be very small.

## Integrating DataTables Extensions

There are a wide variety of [useful extensions](http://datatables.net/extensions/index) for DataTables.

To integrate them into Tabular, just [download the JS and CSS files](http://datatables.net/download/index) for the extension.

Feel free to pick up the debug versions since Meteor should automatically minify them for you.

Next, add the JS and CSS files into the `client/compatibility` directory under your project root.
You can read more about this special folder at http://docs.meteor.com/#/full/structuringyourapp

If you're using the TableTools extension, there is a SWF file that needs to be added as well; it comes with the .zip file or you can directly get the latest version at https://github.com/DataTables/TableTools/tree/master/swf

By default, DataTables looks for the SWF file at `http://yoursite.com/swf/copy_csv_xls.swf`. As a result, create a directory `public/swf` in your Meteor project root and add the `copy_csv_xls.swf` or `copy_csv_xls_pdf.swf` file into that directory.

Then, enable the TableTools extension via the [dom property](http://datatables.net/extensions/tabletools/initialisation) in the DataTable options; you can do this directly in the [Tabular initialization code](#passing-options-to-the-datatable) so you don't need to write any jQuery. You should then be able to see the Flash buttons.

Keep in mind that this extension only works on table rows that the user has selected, so if the buttons aren't doing anything, you will first want to select some rows.
