'use strict';

/**
 * An file-system path that points to a directory or file
 *
 * @typedef {string} Path
 */

/**
 * A general purpose callback which receives an error and result of a task as parameters
 *
 * @callback GenericCallback
 * @param {Error|undefined|null} err reference to the error that occurred during asset generation
 * @param {*} result - the result of the task
 */

// module dependencies
var _ = require('lodash'),
    async = require('async'),
    fsh = require('./fsh'),
    ModuleRegistry = require('./moduleRegistry'),
    AssetGeneratorFactory = require('./assetGeneratorFactory');

// mix in putty
_.mixin(require('putty').mixins);

/**
 * Scans the modules base path for module definitions and populates a {@link ModuleRegistry}
 *
 * @param {GenericCallback} callback - the callback to invoke when the scan is complete
 */
function scanModules(callback) {
  /* jshint validthis: true */
  var scanPath = fsh.resolvePath(this.cwd, this.modulesPath);

  fsh.recurse(scanPath, function (absPath, fileName, filePath) {
    var moduleDef = fsh.readJSON(absPath);

    moduleDef.basePath = filePath;
    this.registry.registerModule(moduleDef);

    this.logger.debug('Found module "%s" at path "%s"',
      moduleDef.name,
      moduleDef.basePath
    );
  }, 'module.json', this);

  callback();
}

/**
 * Identifies a list of asset generators to be run for the specified module or all modules
 *
 * @param {string} moduleName - the name of the module whose asset generators must be identified
 * @return {AssetGenerator[]} a list of {@link AssetGenerator} instances that were identified
 */
function identifyAssetGeneratorsForModule(moduleName) {
  /* jshint validthis: true */
  var singleModule = !(_.isEmpty(moduleName)),
      agFactory = this.assetGeneratorFactory;

  if (singleModule) {
    return agFactory.generatorsFor(moduleName);
  } else {
    _.each(this.registry.getModuleNames(), function (moduleName) {
      agFactory.generatorsFor(moduleName);
    });
  }
}

/**
 * Generates assets of the module with the specified name
 *
 * @param {string|undefined} moduleName - the name of the module whose assets must be built
 * @param {GenericCallback} callback - the callback to invoke when the assets are generated
 */
function generateModuleAssets(moduleName, callback) {
  /* jshint validthis: true */
  var logger = this.logger,
    generators = _.bind(identifyAssetGeneratorsForModule, this)(moduleName);

  if (moduleName)
    logger.debug('Starting to build module "%s"', moduleName);
  else
    logger.debug('Starting to build all modules');

  async.eachSeries(generators, function (generator, asyncCallback) {
    generator.generate(asyncCallback);
  }, callback);
}

/**
 * Builds a specific module with the specified name
 *
 * @param {string} moduleName - the name of the module to build
 * @param {GenericCallback} callback - the callback to invoke when the module is built
 */
function buildSingleModule(moduleName, callback) {
  /* jshint validthis: true */
  var moduleDef = this.registry.getModule(moduleName),
      buildModuleFn = _.bind(buildSingleModule, this),
      generateModuleAssetsFn = _.bind(generateModuleAssets, this);

  if (moduleDef.hasDependencies()) {
    this.logger.debug('Module "%s" has %d dependencies, building them first',
      moduleName, moduleDef.requires.length);

    async.eachSeries(moduleDef.requires, buildModuleFn, function (err) {
      if (err) return callback(err);
      generateModuleAssetsFn(moduleName, callback);
    });

  } else {
    this.logger.debug('Module "%s" has no dependencies.', moduleName);
    generateModuleAssetsFn(moduleName, callback);
  }
}

/**
 * Builds a specific or all modules
 *
 * @param {string|undefined} moduleName - the name of a specific module to build
 * @param {GenericCallback} asyncCallback - the callback to invoke when the build is complete
 */
function buildModules(moduleName, asyncCallback) {
  /* jshint validthis: true */
  var singleModule = !(_.isEmpty(moduleName)),
      buildModuleFn = _.bind(buildSingleModule, this);

  // if singleModule mode and module is not known, die!
  if (singleModule && !(this.registry.hasModule(moduleName)))
    return asyncCallback(new Error(_.fmt('Cannot build unknown module "%s"!', moduleName)));
  else if (singleModule) {
    this.logger.debug('Need to build single module:', moduleName);
    return buildModuleFn(moduleName, asyncCallback);
  }

  // if no modules were found while scanning, die!
  if (!singleModule && _.isEmpty(this.registry.getModuleNames()))
    return asyncCallback(new Error(_.fmt('No modules found in "%s" to build!', this.modulesPath)));

  this.logger.debug('Need to build all modules:',
    this.registry.getModuleNames().join(', '));

  async.eachSeries(this.registry.getModuleNames(), buildModuleFn, asyncCallback);
}

/**
 * Implementation of the Module Maker
 *
 * @param {object} options an object hash containing the options
 * @constructor
 */
function ModuleMaker(options) {
  var registry = new ModuleRegistry();

  options.devMode = options.env === 'development';
  options.destPath = fsh.join(options.cwd, options.destPath);
  options.sharedResourcesPath = fsh.join(options.modulesPath, options.sharedResourcesPath);

  fsh.mkdir(options.destPath);

  _.extend(this, options, {
    registry: registry,
    assetGeneratorFactory: new AssetGeneratorFactory(registry, _.pick(options, [
      'logger',
      'env',
      'devMode',
      'sharedResourcesPath',
      'destPath'
    ]))
  });
}

/**
 * Makes all available modules or the specified module
 *
 * @param {string} [moduleName] name of a module to build
 * @param {function} callback the callback function to
 *                    invoke when module making is complete
 */
ModuleMaker.prototype.make = function (moduleName, callback) {
  async.series([
    _.bind(scanModules, this),
    _.bind(buildModules, this, moduleName)
  ], callback);
};

/**
 * @exports ModuleMaker
 * @type {ModuleMaker}
 */
module.exports = ModuleMaker;