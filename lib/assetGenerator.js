'use strict';

// module dependencies
var _ = require('lodash'),
    crypto = require('crypto'),
    zlib = require('zlib'),
    Buffer = require('buffer').Buffer;

// we'll only support delimiters with format {{<placeholder>}}
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

/**
 * Options required by {@link AssetGenerator} to perform asset generation
 *
 * @typedef {object} AssetGeneratorOptions
 *
 * @prop {logger} logger - the logger to be used by the generator
 * @prop {boolean|undefined} devMode - <code>true</code> if running in a 'development' mode,
 *                                     <code>false</code> or <code>undefined</code> otherwise
 * @prop {Path} sharedResourcePath - the base path to the resources to be shared by all modules
 * @prop {Path} destPath - the base destination path where the generated assets should be stored
 */

/**
 * An abstract implementation of asset generator
 *
 * @param {string} moduleName  - name of the module whose assets have to be generated
 * @param {ModuleRegistry} registry - reference to the module registry
 * @param {string} assetType - the asset type that this asset generator will generator
 * @param {AssetGeneratorOptions} options - the options for asset generation
 *
 * @abstract
 * @constructor
 */
function AssetGenerator(moduleName, registry, assetType, options) {
  _.extend(this, options, {
    moduleName: moduleName,
    registry: registry,
    assetType: assetType,
    currentModuleDefinition: registry.getModule(moduleName)
  });
}

/**
 * Returns a list of generated modules of specified type from the modules that
 * have been designated as parents of the current module
 *
 * @return {Path[]} an array of {@link Path} items which represent the generated
 *                  assets of the current module's parent module(s)
 */
AssetGenerator.prototype.getGeneratedAssetsFromParents = function () {
  var assetType = this.assetType;

  if (!(this.currentModuleDefinition.hasDependencies()))
    return [];

  return _(this.currentModuleDefinition.requires)
    .map(function (parentModuleName) {
      var modDef = this.registry.getModule(parentModuleName);
      if (!(modDef.hasAssets(assetType))) return;
      return modDef.getAssetDefinition(assetType);
    }, this)
    .select(_.identity)
    .reduce(function (assetList, assetDefinition) {
      if (!(assetDefinition.hasGeneratedAssets())) return assetList;
      return assetList.concat(assetDefinition.generatedAssets);
    }, []);
};

/**
 * Performs Gzip compression of the specified data
 *
 * @param {string|buffer~Buffer} data - the data to be gzipped
 * @param {GenericCallback} callback - the callback to be invoked when the data is gzipped
 * @param {string} [encoding] - an option encoding of the specified data, defaults to 'utf8'
 */
AssetGenerator.prototype.gzipData = function (data, callback) {
  var logger = this.logger,
      dataToGzip;

  if (data.env === 'development') {
    logger.debug('In development mode, skipping GZIP step');
    return callback(null, data);
  }

  dataToGzip = data.data;
  if (!(dataToGzip instanceof Buffer))
    dataToGzip = new Buffer(dataToGzip, (data.encoding || 'utf8'));

  return zlib.gzip(dataToGzip, function (err, gzippedData) {
    if (err) return callback(err);
    data.data = gzippedData;
    data.encoding = 'binary';
    callback(null, data);
  });
};

/**
 * Returns a digest of the specified data after hashing it
 *
 * @param {string} data - the string data to be used to
 * @param {string} [algorithm] - the hashing algorithm to be used, defaults to 'md5'
 * @param {string} [encoding] - the encoding of the source data, defaults to 'utf8'
 * @param {string} [format] - the format of the generateHash data, defaults to 'hex'
 *
 * @return {string} the hash digest for the specified data using the specified algorithm and format
 */
function generateHash(data, algorithm, encoding, format) {
  return crypto
    .createHash(algorithm || 'md5')
    .update(data, (encoding || 'utf8'))
    .digest(format || 'hex');
}

/**
 * Calculates a hash for the specified data.
 *
 * @param {object} data - the data whose hash has to be calculated
 * @param {GenericCallback} callback - the callback to be invoked when the hash is calculated
 * @param {string} [encoding] - an optional encoding of the specified data, defaults to 'utf8'
 */
AssetGenerator.prototype.hashData = function (data, callback) {
  var logger = this.logger;

  if (data.env === 'development') {
    logger.debug('In development mode, skipping Hashing step');
    return callback(null, data);
  }

  data.hash = generateHash(data.data, null, (data.encoding || 'utf8'), 'hex');
  callback(null, data);
};

AssetGenerator.prototype.getGeneratedAssetName = function (hash) {
  var ad = this.currentAssetDefinition;
  if (this.env !== 'development')
    return _.template(ad.gzipAsset, { hash: hash });
  return ad.concatAsset;
};

/**
 * @callback AssetGeneratorCallback
 * @param {Error} [err] reference to the error that occurred during asset generation
 */

/**
 * Starts asset generation of the current module
 *
 * <p>Implementations are required to override this method to implement their asset-specific
 * generation logic</p>
 *
 * @param {AssetGeneratorCallback} callback the callback to invoke when the generation is complete
 */
AssetGenerator.prototype.generate = function (callback) {
  return callback(new Error('Not Implemented'));
};

/**
 * @exports
 * @type {AssetGenerator}
 */
module.exports = AssetGenerator;
