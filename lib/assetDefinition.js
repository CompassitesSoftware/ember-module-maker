'use strict';

// module dependencies
var _ = require('lodash'),
    inherits = require('util').inherits;

/**
 * A descriptor for an asset definition
 *
 * @typedef {object} AssetDescriptor
 * @prop {Path[]} src - an array of source assets for assets
 * @prop {Path[]} [templates] - an array of handlebars template assets for assets
 * @prop {string} concatAsset - the name of the concatenated asset to be generated
 * @prop {string} minifiedAsset - the name of the minified asset to be generated
 * @prop {string} gzipAsset - the name of the gzipped asset to be generated
 */

/**
 * Represents a definition of an asset for a module
 *
 * @constructor
 */
function AssetDefinition () {
  this.generatedAssets = [];
}

/**
 * Returns whether or not this {@link AssetDefinition} has any generated assets
 *
 * @return {boolean} <code>true</code> if this asset definition has generated assets,
 *                    <code>false</code> if not
 */
AssetDefinition.prototype.hasGeneratedAssets = function () {
  return !!this.generatedAssets && !(_.isEmpty(this.generatedAssets));
};

/**
 * Implementation of {@link AssetDefinition} for JavaScript assets
 *
 * @param {AssetDescriptor} assetDescriptor - the asset descriptor for the JavaScript asset
 * @constructor
 */
function JavaScriptAssetDefinition(assetDescriptor) {
  _.extend(this, _.pick(assetDescriptor, [
    'src',
    'templatePath',
    'concatAsset',
    'minifiedAsset',
    'gzipAsset'
  ]));
}

/**
 * Implementation of {@link AssetDefinition} for CSS assets
 *
 * @param {AssetDescriptor} assetDescriptor - the asset descriptor for the CSS asset
 * @constructor
 */
function CSSAssetDefinition(assetDescriptor) {
  _.extend(this, _.pick(assetDescriptor, [
    'src',
    'concatAsset',
    'minifiedAsset',
    'gzipAsset'
  ]));
}

/**
 * Implementation of {@link AssetDefinition} for entry-point HTML assets
 *
 * @param {Path} entryPointTemplateName - the path of the entry point Jade template
 * @constructor
 */
function EntryPointAssetDefinition(entryPointTemplateName) {
  this.templateName = entryPointTemplateName;
}

// setup the class hierarchy
inherits(JavaScriptAssetDefinition, AssetDefinition);
inherits(CSSAssetDefinition, AssetDefinition);
inherits(EntryPointAssetDefinition, AssetDefinition);

/**
 * An enumeration of asset definitions
 *
 * @enum {AssetDefinition}
 *
 * @type {{js: JavaScriptAssetDefinition, css: CSSAssetDefinition, entryPoint: EntryPointAssetDefinition}}
 */
exports.AssetTypes = {
  'js': JavaScriptAssetDefinition,
  'css': CSSAssetDefinition,
  'entryPoint': EntryPointAssetDefinition
};