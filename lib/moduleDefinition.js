'use strict';

var _ = require('lodash'),
    assetDefinition = require('./assetDefinition'),
    AssetTypes = assetDefinition.AssetTypes;

function ModuleDefinition(moduleDef) {
  _.extend(this, _.pick(moduleDef, [
    'name',
    'moduleTitle',
    'requires',
    'basePath'
  ]));

  // build the asset definitions
  this.assetDefinitions = _.reduce(AssetTypes, function (defs, defCtor, assetType) {
    /* jshint newcap: false */
    if (!(_.has(moduleDef, assetType))) return defs;
    defs[assetType] = new defCtor(moduleDef[assetType]);
    return defs;
  }, {});
}

_.extend(ModuleDefinition.prototype, {

  hasDependencies: function () {
    return this.requires && !(_.isEmpty(this.requires));
  },

  hasAssets: function (assetType) {
    return _.has(this.assetDefinitions, assetType);
  },

  hasGeneratedAssets: function (assetType) {
    return this.hasAssets(assetType) && this.getAssetDefinition(assetType).hasGeneratedAssets();
  },

  getAssetDefinition: function (assetType) {
    return this.assetDefinitions[assetType];
  },

  getGeneratedAssets: function (assetType) {
    if (!(this.hasGeneratedAssets(assetType))) return [];
    return this.getAssetDefinition(assetType).generatedAssets;
  }

});

module.exports = ModuleDefinition;