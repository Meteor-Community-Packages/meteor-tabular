/* global Package, Npm */

Package.describe({
  name: 'aldeed:tabular',
  summary: 'Datatables for large or small datasets in Meteor',
  version: '2.2.2-rc.2',
  git: 'https://github.com/Meteor-Community-Packages/meteor-tabular.git'
});

Npm.depends({
  'datatables.net': '1.10.12'
});

Package.onUse(function(api) {
  api.versionsFrom(['2.3']);
  api.use([
    'check',
    'ecmascript',
    'underscore',
    'mongo@1.0.0 || 2.0.0',
    'blaze@2.0.0 || 3.0.0',
    'templating@1.4.3',
    'reactive-var',
    'tracker',
    'session'
  ]);

  // jquery is a weak reference in case you want to use a different package or
  // pull it in another way, but regardless you need to make sure it is loaded
  // before any tabular tables are rendered
  api.use(['jquery@1.0.0 || 3.0.0'], 'client', {weak: true});

  api.use(['meteorhacks:subs-manager@1.2.0'], ['client', 'server'], {weak: true});

  api.mainModule('server/main.js', 'server');
  api.mainModule('client/main.js', 'client');

  api.export('Tabular');

  // images
  api.addAssets([
    'images/sort_asc.png',
    'images/sort_asc_disabled.png',
    'images/sort_both.png',
    'images/sort_desc.png',
    'images/sort_desc_disabled.png'
  ], 'client');
});

Package.onTest(function(api) {
  // Tiny Test
  api.use(['aldeed:tabular', 'tinytest']);
  api.use([
    'anti:fake',
    'check',
    'underscore',
    'reactive-var',
    'tracker',
    'ecmascript'
  ]);

  // Load this first:
  api.addFiles('tests/reusedFunctions.js', 'client');
  api.addFiles([
    'tests/util.js',
    'tests/mongoDBQuery.js',
    'tests/utilIntegration.js'
  ], 'client' );
});
