/* global Util:true */

Util = {};

Util.cleanFieldName = function cleanFieldName(field) {
  // for field names with a dot, we just need
  // the top level field name
  var dot = field.indexOf(".");
  if (dot !== -1) {
    field = field.slice(0, dot);
  }

  // If it's referencing an array, strip off the brackets
  field = field.split('[')[0];

  return field;
};

Util.cleanFieldNameForSearch = function cleanFieldNameForSearch(field) {
  // If it's referencing an array, replace the brackets
  // This will only work with an object which doesn't have ["foo"]
  return field.replace(/\[\w+\]/, "");
};
