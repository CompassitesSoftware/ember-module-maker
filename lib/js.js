var path = require('path'),
    _ = require('lodash');

module.exports = function (grunt, opts) {
  'use strict';

  var devMode = opts.env === 'development',
      distPath = opts.distPath,
      jsConcatSeparator = opts.jsConcatSeparator || ';';

  function copySourceAssets(assetDef, moduleBasePath, generatedAssets) {
    // we want to simply copy the source files to the output
    _.each(assetDef.src, function (assetPath) {
      var srcPath = path.resolve(moduleBasePath, assetPath),
          srcFileName = path.basename(assetPath),
          destPath = path.join(distPath, 'js', srcFileName);
      grunt.file.copy(srcPath, destPath);
      generatedAssets.push(path.join('..', 'js', srcFileName));
    });
  }

  function generateAssets(assetDef, moduleBasePath, generatedAssets) {
    // concat the source
    var destPath = path.join(distPath, 'js', assetDef.concatAsset),
        res = _.map(assetDef.src, function (assetPath) {
          assetPath = path.resolve(moduleBasePath, assetPath);
          return grunt.file.read(assetPath);
        }).join(jsConcatSeparator);

    // write out the
    grunt.file.write(destPath, res);

    // add the generated asset path
    generatedAssets.push(path.join('..', 'js', assetDef.concatAsset));

    // minify the output
    // gzip the output
  }

  function buildJavaScriptAssets(moduleName, moduleDefs, callback) {
    var moduleDef = moduleDefs[moduleName],
        moduleBasePath = moduleDef.basePath,
        assetDef = moduleDef.js,
        requires = moduleDef.requires,
        generatedAssets;

    // TODO handle error conditions
    grunt.log.debug('Building javascript assets in path:', moduleBasePath);

    // add the requires paths first
    if (requires && !(_.isEmpty(requires))) {
      generatedAssets = _.reduce(requires, function (generatedAssets, modName) {
        if (!(_.has(moduleDefs, modName) &&
              _.has(moduleDefs[modName], 'js') &&
              _.has(moduleDefs[modName].js, 'generatedAssets')))
          return generatedAssets;
        return generatedAssets.concat(moduleDefs[modName].js.generatedAssets);
      }, []);
    } else
      generatedAssets = [];

    if (devMode)
      copySourceAssets(assetDef, moduleBasePath, generatedAssets);
    else
      generateAssets(assetDef, moduleBasePath, generatedAssets);

    assetDef.generatedAssets = generatedAssets;

    callback();
  }

  return buildJavaScriptAssets;
};