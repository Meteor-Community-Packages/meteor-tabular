Package.describe({
  name: 'aldeed:tabular',
  summary: 'Datatables for large or small datasets in Meteor',
  version: '0.1.0',
  git: 'https://github.com/aldeed/meteor-tabular.git'
});

Package.onUse(function(api) {
  api.versionsFrom(['METEOR@0.9.4']);
  api.use(['check', 'underscore', 'mongo', 'blaze', 'templating']);

  api.export('Tabular');

  api.addFiles('common.js');
  api.addFiles('server/tabular.js', 'server');
  api.addFiles([
    'client/lib/jquery.dataTables.min.js',
    'client/lib/dataTables.bootstrap.js',
    'client/lib/dataTables.bootstrap.css',
    'client/tabular.html',
    'client/tabular.js'
  ], 'client');
});
