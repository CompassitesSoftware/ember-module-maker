/* jshint camelcase: false */
'use strict';

var inherits = require('util').inherits,
    eol = require('os').EOL,
    async = require('async'),
    _ = require('lodash'),
    templateCompiler = require('ember-template-compiler'),
    beautify = require('js-beautify').js_beautify,
    fsh = require('./fsh'),
    AssetGenerator = require('./assetGenerator');

/**
 * An implementation of {@link AssetGenerator} which processes
 * concatenated and minfied JavaScript
 *
 * @param {string} moduleName - the name of the module whose JavaScript must be generated
 * @param {ModuleRegistry} registry - the module registry that contains the module definitions
 * @param {object} options - an object hash containing options for the generation
 *
 * @constructor
 */
function JavaScriptAssetGenerator(moduleName, registry, options) {
  AssetGenerator.call(this, moduleName, registry, 'js', options);
  this.currentAssetDefinition = this.currentModuleDefinition.getAssetDefinition('js');
}

// inherit from AssetGenerator
inherits(JavaScriptAssetGenerator, AssetGenerator);

function compileTemplate(filePath) {
  var fileName = fsh.basename(filePath),
      extName = fsh.extName(fileName),
      templateName = fsh.basename(fileName, extName),
      templateData = fsh.readFile(filePath),
      beautifyOptions = {
        indent_size: 2,
        preserve_newlines: false
      },
      compiledData;

  // append the template data
  compiledData = _.template('// from {{templateFile}} ' + eol, { templateFile: fileName });
  compiledData += beautify('Em.TEMPLATES[\'' + templateName + '\'] = Em.Handlebars.template(' +
    templateCompiler.precompile(templateData, false) + ');', beautifyOptions) + eol + eol;

  return compiledData;
}

function compileAllTemplates(callback) {
  /* jshint validthis: true */
  var logger = this.logger,
      md = this.currentModuleDefinition,
      ad = this.currentAssetDefinition,
      templateFilePath = fsh.join(md.basePath, 'js', 'templates.js'),
      allTemplateData = '',
      templatePath;

  // if no template path, get back
  if (_.isEmpty(ad.templatePath)) return callback();

  templatePath = fsh.resolvePath(md.basePath, ad.templatePath);

  logger.debug('Generating templates for "%s" from "%s"',
    md.name,
    templatePath
  );

  // recursively find all the template paths
  fsh.recurse(templatePath, function (absPath) {
    allTemplateData += compileTemplate(absPath);
  }, '**/*.+(hbs|handlebars|tmpl)', this);

  allTemplateData = allTemplateData.trim();

  fsh.writeFile(templateFilePath, allTemplateData.trim());

  logger.debug('Writing compiled template to "%s"', templateFilePath);

  ad.src.unshift(fsh.relativePath(md.basePath, templateFilePath));

  callback();
}

function concatScriptFiles(callback) {
  callback();
}

/**
 *
 *
 * @param  {AssetGeneratorCallback} callback [description]
 * @return {[type]}            [description]
 */
JavaScriptAssetGenerator.prototype.generate = function (callback) {
  var ad = this.currentAssetDefinition;

  ad.src = ad.src || [];

  async.series([
    _.bind(compileAllTemplates, this),
    _.bind(concatScriptFiles, this)
  ], function (err) {
    if (err) return callback(err);
    console.dir(ad);
    callback();
  });
};

module.exports = JavaScriptAssetGenerator;
