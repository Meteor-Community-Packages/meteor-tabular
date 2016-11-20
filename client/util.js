import { _ } from 'meteor/underscore';

export function cleanFieldName(field) {
  // for field names with a dot, we just need
  // the top level field name
  const dot = field.indexOf('.');
  if (dot !== -1) field = field.slice(0, dot);

  // If it's referencing an array, strip off the brackets
  field = field.split('[')[0];

  return field;
}

export function cleanFieldNameForSearch(field) {
  // Check if object has ["foo"]
  if (field.indexOf('\"') !== -1) {
    console.warn(`The column data value '${field}' contains a " character and will not be properly parsed for enabling search`);
  }
  // If it's referencing an array, replace the brackets
  // This will only work with an object which doesn't have ["foo"]
  return field.replace(/\[\w+\]/, "");
}

export function sortsAreEqual(oldVal, newVal) {
  if (oldVal === newVal) return true;
  var areSame = false;
  if (_.isArray(oldVal) && _.isArray(newVal) && oldVal.length === newVal.length) {
    areSame = _.every(newVal, function (innerArray, i) {
      return innerArray[0] === oldVal[i][0] && innerArray[1] === oldVal[i][1];
    });
  }
  return areSame;
}

export function objectsAreEqual(oldVal, newVal) {
  if (oldVal === newVal) return true;
  return JSON.stringify(oldVal) === JSON.stringify(newVal);
}

// Take the DataTables `order` format and column info
// and convert it into a mongo sort array.
export function getMongoSort(order, columns) {
  if (!order || !columns) return;

  // TODO support the nested arrays format for sort
  // and ignore instance functions like "foo()"
  const sort = [];
  _.each(order, ({ column: colIndex, dir }) => {
    const column = columns[colIndex];

    // Sometimes when swapping out new table columns/collection, this will be called once
    // with the old `order` object but the new `columns`. We protect against that here.
    if (!column) return;

    const propName = column.data;
    const orderable = column.orderable;
    if (typeof propName === 'string' && orderable !== false) {
      sort.push([propName, dir]);
    }
  });
  return sort;
};
