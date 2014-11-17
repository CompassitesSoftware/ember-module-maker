'use strict';

// module dependencies
var _ = require('lodash'),
    assetGeneratorMap = {
      'css': require('./cssAssetGenerator'),
      'entryPoint': require('./entryPointAssetGenerator'),
      'js': require('./javaScriptAssetGenerator')
    };

/**
 * A factory that makes instance of {@link AssetGenerator} objects
 *
 * @param {ModuleRegistry} registry - reference to an instance of {@link ModuleRegistry}
 *                                    containing module definitions
 * @param {object} options - an object hash with options for the generators
 *
 * @constructor
 */
function AssetGeneratorFactory(registry, options) {
  this.registry = registry;
  this.options = options;
  this.logger = options.logger;
}

/**
 * Returns an array of {@link AssetGenerator} instances identified for the module with
 * the specified name
 *
 * @param {string} moduleName the name of the module
 * @return {AssetGenerator[]} an array of {@link AssetGenerator} instances identified for the module
 */
AssetGeneratorFactory.prototype.generatorsFor = function (moduleName) {
  /* jshint newcap: false */
  var moduleDefinition = this.registry.getModule(moduleName),
      logger = this.logger,
      generators = _(assetGeneratorMap).map(function (assetGen, assetType) {
        if (!(moduleDefinition.hasAssets(assetType))) return;
        return new assetGen(moduleName, this.registry, this.options);
      }, this).select(_.identity).value();

  logger.debug('Identified %d generator(s) for module "%s"', generators.length, moduleName);
  return generators;
};

/**
 * @exports AssetGeneratorFactory
 * @type {AssetGeneratorFactory}
 */
module.exports = AssetGeneratorFactory;