'use strict';

// module dependencies
var fsh = require('./fsh'),
    eol = require('os').EOL,
    _ = require('lodash'),
    inherits = require('util').inherits,
    jade = require('jade'),
    currentPath = fsh.dirName(module.id),
    AssetGenerator = require('./assetGenerator');

/**
 * Options that will be passed to the Jade template engine to render the entry-point HTML
 * assets
 *
 * @typedef {object} EntryPointRenderOptions
 *
 * @prop {Path} filename - the path of the Jade template, used when errors are displayed
 * @prop {boolean} pretty - <code>true</code> if the rendered HTML output must be minified,
 *                          <code>false</code> otherwise
 * @prop {boolean} compileDebug - <code>true</code> to add instrumentation enhancements to the
 *                                debugging output, <code>false</code> otherwise
 * @prop {string} [moduleTitle] - an optional module title that will be used to populate the HTML page
 *                                title if used in the source template
 * @prop {string[]} scripts - an array of paths to script assets of the current module relative to the
 *                            destination path of this entry-point asset. An empty array if none.
 * @prop {string[]} styles - an array of paths to script assets of the current module relative to the
 *                            destination path of this entry-point asset. An empty array if none.
 */

/**
 * Returns the HTML rendered by Jade engine from the specified Jade source template data
 * mixing in the specified Jade mixin template data and combining with the specified
 * render options
 *
 * @param {string} sourceData - the Jade source template data
 * @param {string} mixinData - the Jade mixin template data
 * @param {EntryPointRenderOptions} renderOptions - the options to be used for Jade render
 * @param {GenericCallback} callback - the callback to be invoke with the result of the rendering
 */
function render(sourceData, mixinData, renderOptions, callback) {
  var dataToRender = mixinData + eol + eol + sourceData;
  return jade.render(dataToRender, _.extend(renderOptions, { self: true }), callback);
}

/**
 * An implementation of {@link AssetGenerator} which generates HTML assets from
 * Jade template source files as the entry point
 *
 * @param {string} moduleName  name of the module whose CSS assets have to be generated
 * @param {ModuleRegistry} registry the module registry that contains the module definitions
 * @param {AssetGeneratorOptions} options an object hash containing options for the generation
 *
 * @constructor
 */
function EntryPointAssetGenerator(moduleName, registry, options) {
  AssetGenerator.call(this, moduleName, registry, 'entryPoint', options);
  this.currentAssetDefinition = this.currentModuleDefinition.getAssetDefinition('entryPoint');
}

// inherit from AssetGenerator
inherits(EntryPointAssetGenerator, AssetGenerator);

/**
 * Starts asset generation of the entry-point HTML for the current module
 *
 * @param {AssetGeneratorCallback} callback the callback to invoke when the generation is complete
 */
EntryPointAssetGenerator.prototype.generate = function (callback) {
  /* jshint unused: false */
  var logger = this.logger,
      md = this.currentModuleDefinition,
      ad = this.currentAssetDefinition,
      assetMixinPath = fsh.resolvePath(currentPath, 'asset-mixins.jade'),
      destPath = fsh.join(this.destPath, md.name, 'index.html'),
      tmplPath = fsh.resolvePath(md.basePath, ad.templateName),
      tmplRenderOptions = {
        filename: tmplPath,
        pretty: this.devMode,
        compileDebug: this.devMode,
        moduleTitle: md.moduleTitle,
        scripts: md.getGeneratedAssets('js'),
        styles: md.getGeneratedAssets('css')
      };

  logger.debug('Generating entry-point for module:', md.name);

  // ensure destination path exists for the module name
  fsh.mkdir(fsh.join(this.destPath, md.name));

  // render the JADE template to HTML and write the output
  render(fsh.readFile(tmplPath), fsh.readFile(assetMixinPath), tmplRenderOptions, function (err, output) {
    if (err) return callback(err);

    fsh.writeFile(destPath, output);
    logger.debug('Wrote out entrypoint HTML:', destPath);

    callback();
  });
};

/**
 * @exports
 * @type {EntryPointAssetGenerator}
 */
module.exports = EntryPointAssetGenerator;