/* jshint camelcase: false */
'use strict';

var inherits = require('util').inherits,
    eol = require('os').EOL,
    async = require('async'),
    _ = require('lodash'),
    templateCompiler = require('ember-template-compiler'),
    beautify = require('js-beautify').js_beautify,
    uglify = require('uglify-js'),
    fsh = require('./fsh'),
    AssetGenerator = require('./assetGenerator'),
    parentDirRex = /.+\/(.+)$/,
    defaultUglifyOptions = {
      fromString: true,
      warnings: true,
      output: {
        comments: false
      },
      compressor: {
        dead_code: true,
        warnings: true,
      }
    };

// we'll only support delimiters with format {{<placeholder>}}
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

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

function compileTemplate(filePath, fileName, dirName, templatePath) {
  var extName = fsh.extName(fileName),
      templateName = fsh.basename(fileName, extName),
      templateData = fsh.readFile(filePath),
      templateDirMatches = dirName.match(parentDirRex),
      beautifyOptions = {
        indent_size: 2,
        preserve_newlines: false
      },
      compiledData;

  // if template is empty, return empty
  if (_.isEmpty(templateData)) return '';

  // prefix with 'components/' for all templates inside components
  if(dirName !== templatePath && templateDirMatches.length > 1)
    templateName = fsh.join(templateDirMatches[1], templateName);

  // append the template data
  compiledData = _.template('// from {{templateFile}}' + eol, { templateFile: fileName });
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
      successResult = {
        encoding: 'utf8',
        env: this.env
      },
      templatePath;

  // if no template path, get back
  if (_.isEmpty(ad.templatePath)) return callback(null, successResult);

  // delete any previously generated template
  fsh.deleteFile(templateFilePath);

  templatePath = fsh.resolvePath(md.basePath, ad.templatePath);

  logger.debug('Generating templates for "%s" from "%s"',
    md.name,
    templatePath
  );

  // recursively find all the template paths

  fsh.recurse(templatePath, function (absPath, fileName, dirName, startPath) {
    allTemplateData += compileTemplate(absPath, fileName, dirName, startPath);
  }, '**/*.+(hbs|handlebars|tmpl)', this);

  // if no template data
  if (_.isEmpty(allTemplateData)) return callback(null, successResult);

  // write out the compiled template into the source path
  allTemplateData = allTemplateData.trim() + eol;
  fsh.writeFile(templateFilePath, allTemplateData);

  logger.debug('Writing compiled template to "%s"', templateFilePath);

  // add the generated file to the list of source files
  ad.src.unshift(fsh.relativePath(md.basePath, templateFilePath));

  callback(null, successResult);
}

function copySourceAssets(moduleDef, assetDef, distPath, env) {
  // we want to simply copy the source files to the output
  _.each(assetDef.src, function (assetPath) {
    var srcPath, destFileName, destPath;

    assetPath = _.template(assetPath, {environment: env});
    srcPath = fsh.resolvePath(moduleDef.basePath, assetPath);
    destFileName = fsh.basename(assetPath);

    // prefix the file name with the module name
    destFileName = moduleDef.name + '-' + destFileName;

    destPath = fsh.join(distPath, 'js', destFileName);

    // copy source to destination
    fsh.copyFile(srcPath, destPath);

    assetDef.generatedAssets.push('/' +
      fsh.join('js', destFileName));
  });
}

function concatScriptFiles(data, callback) {
  /* jshint validthis: true */
  var md = this.currentModuleDefinition,
      ad = this.currentAssetDefinition,
      distPath = this.destPath,
      env = this.env,
      result;

  if (this.devMode) {
    copySourceAssets(md, ad, distPath, env);
    return callback(null, {
      env: env
    });
  }

  // concat the result
  result = _.map(ad.src, function (assetPath) {
    assetPath = fsh.resolvePath(md.basePath,
      _.template(assetPath, {environment: env}));
    return fsh.readFile(assetPath);
  }).join(eol + this.jsConcatSeparator + eol);

  callback(null, {
    data: result,
    env: env
  });
}

function minifyScripts(data, callback) {
  var result;

  /* jshint validthis: true */
  if (this.devMode) return callback(null, data);

  // invoke uglify to minify the code
  result = uglify.minify(data.data, defaultUglifyOptions);
  data.data = result.code;

  callback(null, data);
}

/**
 * Starts the generation of the JS assets and invokes specified
 * callback with an error if generation fails or the generated
 * asset data if successful
 *
 * @param  {AssetGeneratorCallback} callback - the callback to invoke when the generation is complete
 */
JavaScriptAssetGenerator.prototype.generate = function (callback) {
  var that = this,
      md = this.currentModuleDefinition,
      ad = this.currentAssetDefinition,
      distPath = this.destPath;

  // defensive
  ad.src = ad.src || [];

  // ensure destination path exists
  fsh.mkdir(fsh.join(distPath, 'js'));

  // add the generated assets from parents
  ad.generatedAssets = md.hasDependencies() ?
    this.getGeneratedAssetsFromParents() : [];

  async.waterfall([
    _.bind(compileAllTemplates, this),
    _.bind(concatScriptFiles, this),
    _.bind(minifyScripts, this),
    _.bind(this.hashData, this),
    _.bind(this.gzipData, this)
  ], function (err, data) {
    var outputPath,
        logger = that.logger;

    if (err) return callback(err);
    if (that.devMode) return callback();

    outputPath = fsh.join(distPath, 'js', that.getGeneratedAssetName(data.hash));

    try {
      fsh.writeFile(outputPath, data.data);
      logger.debug('Wrote out file:', outputPath);
    } catch (ex) {
      return callback(ex);
    }

    // add the generated file to
    ad.generatedAssets.push('/' + fsh.join('js', fsh.basename(outputPath)));

    callback();
  });
};

/**
 * @exports JavaScriptAssetGenerator
 * @type {JavaScriptAssetGenerator}
 */
module.exports = JavaScriptAssetGenerator;
