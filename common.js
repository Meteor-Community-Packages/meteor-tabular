Tabular = {}; //exported

tablesByName = {};

Tabular.Table = function(options) {
  var self = this;

  if (!options) {
    throw new Error("Tabular.Table options argument is required");
  }

  if (!options.name) {
    throw new Error("Tabular.Table options must specify name");
  }
  self.name = options.name;

  if (!(options.collection instanceof Mongo.Collection)) {
    throw new Error("Tabular.Table options must specify collection");
  }
  self.collection = options.collection;

  self.pub = options.pub || "tabular_genericPub";

  if (!options.columns) {
    throw new Error("Tabular.Table options must specify columns");
  }

  self.options = _.omit(options, "collection", "pub", "name");

  tablesByName[self.name] = self;
};