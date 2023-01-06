aldeed:tabular
=========================

A Meteor package that creates reactive [DataTables](http://datatables.net/) in an efficient way, allowing you to display the contents of enormous collections without impacting app performance.


## !!! MAINTAINERS WANTED !!!

Please open an issue if you like to help out with maintenance on this package.


## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Features](#features)
- [Installation](#installation)
- [Installing and Configuring a Theme](#installing-and-configuring-a-theme)
- [Online Demo App](#online-demo-app)
- [Example](#example)
- [Displaying Only Part of a Collection's Data Set](#displaying-only-part-of-a-collections-data-set)
- [Passing Options to the DataTable](#passing-options-to-the-datatable)
- [Template Cells](#template-cells)
- [Searching](#searching)
  - [Customizing Search Behavior](#customizing-search-behavior)
- [Using Collection Helpers](#using-collection-helpers)
- [Publishing Extra Fields](#publishing-extra-fields)
- [Modifying the Selector](#modifying-the-selector)
- [Saving state](#saving-state)
- [Security](#security)
- [Caching the Documents](#caching-the-documents)
- [Hooks](#hooks)
- [Rendering a responsive table](#rendering-a-responsive-table)
- [Active Datasets](#active-datasets)
- [Using a Custom Publish Function](#using-a-custom-publish-function)
  - [Example](#example-1)
- [Tips](#tips)
  - [Get the DataTable instance](#get-the-datatable-instance)
  - [Detect row clicks and get row data](#detect-row-clicks-and-get-row-data)
  - [Search in one column](#search-in-one-column)
  - [Adjust column widths](#adjust-column-widths)
  - [Turning Off Paging or Showing "All"](#turning-off-paging-or-showing-all)
  - [Customize the "Processing" Message](#customize-the-processing-message)
  - [I18N Example](#i18n-example)
  - [Reactive Column Titles](#reactive-column-titles)
- [Integrating DataTables Extensions](#integrating-datatables-extensions)
  - [Example: Adding Buttons](#example-adding-buttons)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## ATTENTION: Updating to 2.0

Version 2.0 API is backwards compatible other than the following changes:
- Requires Meteor 1.3+
- You must explicitly import the `Tabular` object into every file where you use it. (`import Tabular from 'meteor/aldeed:tabular';`)
- You must configure the Bootstrap theme (or whatever theme you want) yourself. See [Installing and Configuring a Theme](#installing-and-configuring-a-theme)

This version also includes a few fixes and a few new features.

## Features

* Fast: Uses an intelligent automatic data subscription so that table data is not loaded until it's needed.
* Reactive: As your collection data changes, so does your table. You can also reactively update the query selector if you provide your own filter buttons outside of the table.
* Customizable: Anything you can do with the DataTables library is supported, and you can provide your own publish function to build custom tables or tables than join data from two collections.
* Hot Code Push Ready: Remains on the same data page after a hot code push.

Although this appears similar to the [jquery-datatables](https://github.com/LumaPictures/meteor-jquery-datatables) Meteor package, there are actually many differences:

* This package is updated to work with Meteor 1.3+.
* This package has a much smaller codebase and includes less of the DataTables library.
* This package allows you to specify a Blaze template as a cell's content.
* This package handles the reactive table updates in a different way.
* This package is designed to work with any DataTables theme

## Installation

```bash
$ meteor add aldeed:tabular
```

## Installing and Configuring a Theme

This example is for the Bootstrap theme. You can use another theme package. See https://datatables.net/download/npm

First:

```bash
$ npm install --save jquery@1.12.1 datatables.net-bs
```

Note that we install jquery@1.12.1. This needs to match the current version of jQuery included with Meteor's `jquery` package. (See the version comment in https://github.com/meteor/meteor/blob/master/packages/non-core/jquery/package.js) Otherwise, due to the `datatables.net` package depending on `jquery` NPM package, it might automatically install the latest `jquery` version, which may conflict with Bootstrap or Meteor.

Then, somewhere in your client JavaScript:

```js
import { $ } from 'meteor/jquery';
import dataTablesBootstrap from 'datatables.net-bs';
import 'datatables.net-bs/css/dataTables.bootstrap.css';
dataTablesBootstrap(window, $);
```

## Online Demo App

View a [demonstration project on Meteorpad](http://meteorpad.com/pad/xNafF9N5XJNrFJEyG/TabularDemo).

Another example app courtesy of @AnnotatedJS:
* Hosted app: http://greatalbums.meteor.com/albums (You can sign in with email "admin@demo.com" and password "password")
* Source: https://github.com/AnnotatedJS/GreatAlbums

## Example

Define your table in common code (code that runs in both NodeJS and browser):

```js
import Tabular from 'meteor/aldeed:tabular';
import { Template } from 'meteor/templating';
import moment from 'moment';
import { Meteor } from 'meteor/meteor';
import { Books } from './collections/Books';

new Tabular.Table({
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
  selector() {
    return {author: "Agatha Christie"}; // this could be pulled from a Session var or something that is reactive
  }
});
```

If you want to limit what is published to the client for security reasons you can provide a selector in the constructor which will be used by the publications. Selectors provided this way will be combined with selectors provided to the template using an AND relationship. Both selectors may query on the same fields if necessary.

```js
new Tabular.Table({
  // other properties...
  selector(userId) {
    return { documentOwner: userId };
  }
});
```

## Passing Options to the DataTable

The [DataTables documentation](http://datatables.net/reference/option/) lists a huge variety of available table options and callbacks. You may add any of these to your `Tabular.Table` constructor options and they will be used as options when constructing the DataTable.

Example:

```js
new Tabular.Table({
  // other properties...
  createdRow( row, data, dataIndex ) {
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
  tmplContext(rowData) {
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

### Customizing Search Behavior

You can add a `search` object to your table options to change the default behavior. The defaults are:

```js
{
  search: {
    caseInsensitive: true,
    smart: true,
    onEnterOnly: false,
  }
}
```

You can set `caseInsensitive` or `smart` to `false` if you prefer. See http://datatables.net/reference/option/search. The `regex` option is not yet supported.

`onEnterOnly` is custom to this package. Set it to `true` to run search only when the user presses ENTER in the search box, rather than on keyup. This is useful for large collections to avoid slow searching.

There are also two options to optimize searching for particular columns:

```js
columns: [
    {
      data: '_id',
      title: 'ID',
      search: {
        isNumber: true,
        exact: true,
      },
    },
]
```

For each column, you can set `search.isNumber` to `true` to cast whatever is entered to a `Number` and search for that, and you can set `search.exact` to `true` to search only for an exact match of the search string. (This overrides the table-level `caseInsensitive` and `smart` options for this column only.)

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
  changeSelector(selector, userId) {
    // modify it here ...
    return selector;
  }
});
```

## Saving state

Should you require the current state of pagination, sorting, search, etc to be saved you can use the default functionality of Datatables.

Add stateSave as a property when defining the Datatable.
```js
TabularTables.Posts = new Tabular.Table({
  // other properties...
  stateSave: true
});
```

Add an ID parameter to the template include. This is used in localstorage by datatables to keep the state of your table. Without this state saving will not work.
```html
{{> tabular table=TabularTables.Posts id="poststableid" selector=selector class="table table-striped table-bordered table-condensed"}}
```

## Security

You can optionally provide an `allow` and/or `allowFields` function to control which clients can get the published data. These are used by the built-in publications on the server only.

```js
TabularTables.Books = new Tabular.Table({
  // other properties...
  allow(userId) {
    return false; // don't allow this person to subscribe to the data
  },
  allowFields(userId, fields) {
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

## Rendering a responsive table

Use these table options:

```js
responsive: true,
autoWidth: false,
```

## Active Datasets

If your table is showing a dataset that changes a lot, it could become unusable due to reactively updating too often. You can throttle how often a table updates with the following table option:

```js
throttleRefresh: 5000
```

Set it to the number of milliseconds to wait between updates, even if the data is changing more frequently.

## Using a Custom Publish Function

This package takes care of publication and subscription for you using two built-in publications. The first publication determines the list of document `_id`s that
are needed by the table. This is a complex publication and there should be no need to override it. The second publication publishes the actual documents with those `_id`s.

The most common reason to override the second publication with your own custom one is to publish documents from related collections at the same time.

To tell Tabular to use your custom publish function, pass the publication name as the `pub` option. Your function:

* MUST accept and check three arguments: `tableName`, `ids`, and `fields`
* MUST publish all the documents where `_id` is in the `ids` array.
* MUST do any necessary security checks
* SHOULD publish only the fields listed in the `fields` object, if one is provided.
* MAY also publish other data necessary for your table

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
  email() {
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
  allow(userId) {
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
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    // Your click handler logic here
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

### Customize the "Processing" Message

To customize the "Processing" message appearance, use CSS selector `div.dataTables_wrapper div.dataTables_processing`. To change or translate the text, see https://datatables.net/reference/option/language.processing

### I18N Example

Before rendering the table on the client:


```js
if (Meteor.isClient) {
	$.extend(true, $.fn.dataTable.defaults, {
		language: {
      "lengthMenu": i18n("tableDef.lengthMenu"),
      "zeroRecords": i18n("tableDef.zeroRecords"),
      "info": i18n("tableDef.info"),
      "infoEmpty": i18n("tableDef.infoEmpty"),
      "infoFiltered": i18n("tableDef.infoFiltered")
    }
	});
}
```

More options to translate can be found here: https://datatables.net/reference/option/language

### Reactive Column Titles

You can set the `titleFn` column option to a function instead of supplying a string `title` option. This is reactively rerun as necessary.

### Optimizing the Total Table Count

By default, a count of the entire available filtered dataset is done on the server. This can be slow for large datasets. You have two options that can help:

First, you can calculate total counts yourself and return them from a function provided as the `alternativeCount` option to your `Tabular.Table`:

```js
alternativeCount: (selector) => 200,
```

Second, you can skip the count altogether. If you do this, we return a fake count that ensures the Next button will be available. But the fake count will not be the correct total count, so the paging info and the numbered page buttons will be misleading. To deal with this, you should use `pagingType: 'simple'` and either `info: false` or an `infoCallback` function that omits the total count:

```js
skipCount: true,
pagingType: 'simple',
infoCallback: (settings, start, end) => `Showing ${start} to ${end}`,
```

## Integrating DataTables Extensions

There are a wide variety of [useful extensions](http://datatables.net/extensions/index) for DataTables. To integrate them into Tabular, it is best to use the NPM packages.

### Example: Adding Buttons

To add buttons for print, column visibility, file export, and more, you can use the DataTables buttons extension. Install the necessary packages in your app with NPM. For example, if you're using the Bootstrap theme, run:

```bash
$ npm install --save datatables.net-buttons datatables.net-buttons-bs
```

For package names for other themes, see https://datatables.net/download/npm

Once the packages are installed, you need to import them in one of your client JavaScript files:

```js
import { $ } from 'meteor/jquery';

// Bootstrap Theme
import dataTablesBootstrap from 'datatables.net-bs';
import 'datatables.net-bs/css/dataTables.bootstrap.css';

// Buttons Core
import dataTableButtons from 'datatables.net-buttons-bs';

// Import whichever buttons you are using
import columnVisibilityButton from 'datatables.net-buttons/js/buttons.colVis.js';
import html5ExportButtons from 'datatables.net-buttons/js/buttons.html5.js';
import flashExportButtons from 'datatables.net-buttons/js/buttons.flash.js';
import printButton from 'datatables.net-buttons/js/buttons.print.js';

// Then initialize everything you imported
dataTablesBootstrap(window, $);
dataTableButtons(window, $);
columnVisibilityButton(window, $);
html5ExportButtons(window, $);
flashExportButtons(window, $);
printButton(window, $);
```

Finally, for the Tabular tables that need them, add the `buttons` and `buttonContainer` options. The `buttons` option is part of DataTables and is documented here: https://datatables.net/extensions/buttons/ The `buttonContainer` option is part of `aldeed:tabular` and does the tricky task of appending the buttons to some element in the generated table. Set it to the CSS selector for the container.

Bootstrap example:

```js
new Tabular.Table({
  // other properties...
  buttonContainer: '.col-sm-6:eq(0)',
  buttons: ['copy', 'excel', 'csv', 'colvis'],
});
```

If you are using the default DataTables theme, you can use the `dom` option instead of `buttonContainer`. See https://datatables.net/extensions/buttons/#Displaying-the-buttons
