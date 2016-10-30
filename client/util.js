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
  _.each(order, function (ord) {
    const propName = columns[ord.column].data;
    const orderable = columns[ord.column].orderable;
    console.log(propName, orderable, ord, columns);
    if (typeof propName === 'string' && orderable !== false) {
      sort.push([propName, ord.dir]);
    }
  });
  console.log('sort', sort);
  return sort;
};
