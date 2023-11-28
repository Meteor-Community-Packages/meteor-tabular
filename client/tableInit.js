import { Blaze } from 'meteor/blaze';
import { _ } from 'meteor/underscore';
import { cleanFieldName, cleanFieldNameForSearch } from '../common/util';

/**
 * Uses the Tabular.Table instance to get the columns, fields, and searchFields
 * @param {Tabular.Table} tabularTable The Tabular.Table instance
 * @param {Template}      template     The Template instance
 */
function tableInit(tabularTable, template) {
  const fields = {};
  const searchFields = [];

  // Loop through the provided columns object
  let columns = tabularTable.options.columns || [];
  
  if (typeof columns === 'function') {
    columns = tabularTable.options.columns();
  }

  columns = columns.map(column => {
    const options = { ...column };

    _.extend(options, templateColumnOptions(template, column));

    // `templateColumnOptions` might have set defaultContent option. If not, we need it set
    // to something to protect against errors from null and undefined values.
    if (!options.defaultContent) {
      options.defaultContent = column.defaultContent || '';
    }

    _.extend(options, searchAndOrderOptions(column));

    // Build the list of field names we want included in the publication and in the searching
    const data = column.data;
    if (typeof data === 'string') {
      fields[cleanFieldName(data)] = 1;

      // DataTables says default value for col.searchable is `true`,
      // so we will search on all columns that haven't been set to
      // `false`.
      if (options.searchable !== false) {
        searchFields.push(cleanFieldNameForSearch(data));
      }
    }

    // If `titleFn` option is provided, we set `title` option to the string
    // result of that function. This is done for any extensions that might
    // use the title, such as the colvis button. However `Blaze.toHTML` is
    // not reactive, so in the `headerCallback` in main.js, we will set the
    // actual column header with Blaze.render so that it is reactive.
    const titleFunction = options.titleFn;
    if (typeof titleFunction === 'function') {
      options.title = Blaze.toHTML(new Blaze.View(titleFunction));
    }

    return options;
  });
  template.tabular.columns = columns;
  template.tabular.fields = fields;
  template.tabular.searchFields = searchFields;

  return columns;
}

// The `tmpl` column option is special for this package. We parse it into other column options
// and then remove it.
function templateColumnOptions(template, { data, render, tmpl, tmplContext }) {

  if (!tmpl) {
    return {};
  }

  const options = {};

  // Cell should be initially blank
  options.defaultContent = '';

  // When the cell is created, render its content from
  // the provided template with row data.
  options.createdCell = (cell, cellData, rowData) => {
    // Allow the table to adjust the template context if desired
    if (typeof tmplContext === 'function') {
      rowData = tmplContext(rowData);
    }

    //this will be called by DT - let's keep track of all blazeviews it makes us create
    let view = Blaze.renderWithData(tmpl, rowData, cell);
    template.tabular.blazeViews.push(view);
    return view;
  };

  // If we're displaying a template for this field and we've also provided data, we want to
  // pass the data prop along to DataTables to enable sorting and filtering.
  // However, DataTables will then add that data to the displayed cell, which we don't want since
  // we're rendering a template there with Blaze. We can prevent this issue by having the "render"
  // function return an empty string for display content.
  if (data && !render) {
    options.render = (data, type) => (type === 'display' ? '' : data);
  }

  return options;
}

// If it's referencing an instance function, don't
// include it. Prevent sorting and searching because
// our pub function won't be able to do it.
function searchAndOrderOptions(column) {
  const data = column.data;
  if (typeof data === 'string' && data.indexOf('()') !== -1) {
    return { orderable: false, searchable: false };
  }
  // If there's a Blaze template but not data, then we shouldn't try to allow sorting. It won't work
  if (column.tmpl && !data) {
    return { orderable: false, searchable: column.searchable };
  }
  return { orderable: column.orderable, searchable: column.searchable };
}

export default tableInit;
