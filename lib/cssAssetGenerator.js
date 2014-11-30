'use strict';

// module dependencies
var _ = require('lodash'),
    inherits = require('util').inherits,
    eol = require('os').EOL,
    less = require('less'),
    fsh = require('./fsh'),
    async = require('async'),
    AssetGenerator = require('./assetGenerator');

_.mixin(require('putty').mixins);

// we'll only support delimiters with format {{<placeholder>}}
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

/**
 * An implementation of {@link AssetGenerator} which generates CSS assets from
 * LESS source files
 *
 * @param {string} moduleName - name of the module whose CSS assets have to be generated
 * @param {ModuleRegistry} registry - the module registry that contains the module definitions
 * @param {object} options - an object hash containing options for the generation
 *
 * @constructor
 */
function CssAssetGenerator(moduleName, registry, options) {
  AssetGenerator.call(this, moduleName, registry, 'css', options);
  this.currentAssetDefinition = this.currentModuleDefinition.getAssetDefinition('css');
}

// inherit from AssetGenerator
inherits(CssAssetGenerator, AssetGenerator);

/**
 * Reads in the specified file and invokes the LESS compiler on the file data to
 * compile the CSS output.
 *
 * @param {Path} fileName - the path of the LESS source file
 * @param {GenericCallback} callback - the callback to invoke when the LESS compilation is complete
 */
function invokeLess(fileName, callback) {
  /* jshint validthis: true */
  var logger = this.logger,
      sharedResourcesPath = this.sharedResourcesPath,
      moduleBasePath = this.currentModuleDefinition.basePath,
      sourceFile = fsh.resolvePath(moduleBasePath, fileName),
      fileData;

  try {
    fileData = fsh.readFile(sourceFile);
  } catch (ex) {
    callback(ex);
  }

  logger.debug('Invoking LESS to compile file:', fileName);

  return less.render(fileData, {
    paths: [
      fsh.dirName(sourceFile),
      fsh.join(moduleBasePath, 'css'),
      fsh.join(sharedResourcesPath, 'css') ],
    compress: !(this.devMode)
  }, callback);
}

function compileAndConcat(callback) {
  /* jshint validthis: true */
  var that = this,
      ad = that.currentAssetDefinition;

  // convert the LESS files to CSS
  async.mapSeries(ad.src, _.bind(invokeLess, that), function (err, compiledResults) {
    if (err) return callback(err);

    // write out the LESS compiled CSS output to the output file
    var compiledAndConcatData = _.reduce(compiledResults, function (result, fileData, idx) {
      var fileName = ad.src[idx];

      fileName = fsh.extName(fileName, '.less') ?
      fsh.basename(fileName, '.less') + '.css' :
        fsh.basename(fileName);

      return result + _.template('/* from file "{{fileName}}" */', {
          fileName: fileName
        }) + eol + fileData + eol;
    }, '');

    // send to next path
    callback(null, {
      data: compiledAndConcatData,
      fileName: ad.concatAsset,
      encoding: 'utf8',
      env: that.env
    });
  });
}

function generateModuleAsset(callback, err, data) {
  /* jshint validthis: true */
  var md = this.currentModuleDefinition,
      ad = this.currentAssetDefinition,
      distPath = this.destPath,
      logger = this.logger,
      outputPath;

  if (err) return callback(err);

  // ensure destination path exists
  fsh.mkdir(fsh.join(distPath, 'css'));

  outputPath = fsh.join(distPath, 'css', this.getGeneratedAssetName(data.hash));

  try {
    fsh.writeFile(outputPath, data.data);
    logger.debug('Wrote out CSS:', outputPath);
  } catch (ex) {
    return callback(ex);
  }

  // add the generated assets from parents
  ad.generatedAssets = md.hasDependencies() ?
    this.getGeneratedAssetsFromParents() : [];

  logger.debug('CSS Dependency list for "%s"', md.name, JSON.stringify(ad.generatedAssets, undefined, 2));

  // add the generated file to
  ad.generatedAssets.push('/' + fsh.join('css', fsh.basename(outputPath)));

  callback();
}

/**
 * Starts the generation of the CSS assets and invokes specified
 * callback with an error or when the generation is complete
 *
 * @param {AssetGeneratorCallback} callback - the callback to invoke when the generation is complete
 */
CssAssetGenerator.prototype.generate = function (callback) {
  async.waterfall([
    _.bind(compileAndConcat, this),
    _.bind(this.hashData, this),
    _.bind(this.gzipData, this)
  ], _.bind(generateModuleAsset, this, callback));
};

/**
 * @exports CssAssetGenerator
 *
 * @type {CssAssetGenerator}
 */
module.exports = CssAssetGenerator;
