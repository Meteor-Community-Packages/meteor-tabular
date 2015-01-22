/* global tableInit:true, _, Blaze, Util */

/**
 * Uses the Tabular.Table instance to get the columns, fields, and searchFields
 * @param {Tabular.Table} tabularTable The Tabular.Table instance
 * @param {Template}      template     The Template instance
 */
tableInit = function tableInit(tabularTable, template) {
  var columns = _.clone(tabularTable.options.columns);
  var fields = {}, searchFields = [];

  // Loop through the provided columns object
  _.each(columns, function (col) {
    // The `tmpl` column option is special for this
    // package. We parse it into other column options
    // and then remove it.
    var tmpl = col.tmpl;
    if (tmpl) {
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

      fields[Util.cleanFieldName(dataProp)] = 1;

      // DataTables says default value for col.searchable is `true`,
      // so we will search on all columns that haven't been set to
      // `false`.
      if (col.searchable !== false) {
        searchFields.push(Util.cleanFieldNameForSearch(dataProp));
      }
    }

    // If we're displaying a template for this field,
    // don't pass the data prop along to DataTables.
    // This prevents both the data and the template
    // from displaying in the same cell. We wait until
    // now to do this to be sure that we still include
    // the data prop in the list of fields.
    if (tmpl) {
      col.data = null;
    }
  });

  if (typeof tabularTable.extraFields === 'object') {
    _.extend(fields, tabularTable.extraFields);
  }

  template.tabular.columns = columns;
  template.tabular.fields.set(fields);
  template.tabular.searchFields = searchFields;
};
