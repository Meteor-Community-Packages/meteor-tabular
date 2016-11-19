import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

const Tabular = {};

Tabular.tablesByName = {};

Tabular.Table = class {
  constructor(options) {
    if (!options) throw new Error('Tabular.Table options argument is required');
    if (!options.name) throw new Error('Tabular.Table options must specify name');
    if (!options.columns) throw new Error('Tabular.Table options must specify columns');
    if (!(options.collection instanceof Mongo.Collection
      || options.collection instanceof Mongo.constructor // Fix: error if `collection: Meteor.users`
    )) {
      throw new Error('Tabular.Table options must specify collection');
    }

    this.name = options.name;
    this.collection = options.collection;

    this.pub = options.pub || 'tabular_genericPub';

    // By default we use core `Meteor.subscribe`, but you can pass
    // a subscription manager like `sub: new SubsManager({cacheLimit: 20, expireIn: 3})`
    this.sub = options.sub || Meteor;

    this.onUnload = options.onUnload;
    this.allow = options.allow;
    this.allowFields = options.allowFields;
    this.changeSelector = options.changeSelector;
    this.throttleRefresh = options.throttleRefresh;
    this.alternativeCount = options.alternativeCount;
    this.skipCount = options.skipCount;

    if (_.isArray(options.extraFields)) {
      const fields = {};
      _.each(options.extraFields, fieldName => {
        fields[fieldName] = 1;
      });
      this.extraFields = fields;
    }

    this.selector = options.selector;

    this.options = _.omit(
      options,
      'collection',
      'pub',
      'sub',
      'onUnload',
      'allow',
      'allowFields',
      'changeSelector',
      'throttleRefresh',
      'extraFields',
      'alternativeCount',
      'skipCount',
      'name',
      'selector'
    );

    Tabular.tablesByName[this.name] = this;
  }
}

export default Tabular;
