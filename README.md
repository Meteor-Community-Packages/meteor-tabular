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

## Using a Custom Publish Function