Package.describe({
  name: 'robertredl:tabular',
  summary: ' /* Fill me in! */ ',
  version: '1.0.0',
  git: ' /* Fill me in! */ '
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.addFiles('robertredl:tabular.js');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('robertredl:tabular');
  api.addFiles('robertredl:tabular-tests.js');
});
