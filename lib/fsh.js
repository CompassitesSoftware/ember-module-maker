/* jshint unused: false */
'use strict';

var fs = require('graceful-fs'),
    path = require('path'),
    _ = require('lodash'),
    Minimatch = require('minimatch').Minimatch;

_.mixin(require('putty').mixins);

var exists = exports.exists = function (destPath) {
  return fs.existsSync(destPath);
};

/**
 * Alias to {@link fs.Stats}
 */
var isDirectory = exports.isDirectory = function (filePath) {
  return fs.statSync(filePath).isDirectory();
};

/**
 * Alias to {@link fs.Stats}
 */
var isFile = exports.isFile = function (filePath) {
  return fs.statSync(filePath).isFile();
};

/**
 * Alias to {@link path#dirname}
 */
var dirName = exports.dirName = function (filePath) {
  return path.dirname(filePath);
};

/**
 * Alias to {@link path#dirname}
 */
var extName = exports.extName = function (filePath) {
  return path.extname(filePath);
};

/**
 * Alias to {@link path#basename}
 */
var basename = exports.basename = function (filePath, ext) {
  return path.basename(filePath, ext);
};

/**
 * Alias to {@link path#join}
 */
var join = exports.join = function () {
  return path.join.apply(path, _.arrgs(arguments));
};

/**
 * Alias to {@link path#resolve}
 */
var resolvePath = exports.resolvePath = function (basePath, filePath) {
  return path.resolve(basePath, filePath);
};

/**
 * Alias to {@link path#relative}
 */
var relativePath = exports.relativePath = function (from, to) {
  return path.relative(from, to);
};

/**
 * Process through all items in the specified start path, if directories
 * are found, recurse into them calling the specified callback
 *
 * @param {string} startPath
 * @param {function} callback
 * @param {string} [filePattern]
 * @param {object} [context]
 *
 * @returns {string[]}
 */
exports.recurse = function recurse(startPath, callback, filePattern, context, rootPath) {
  var pattern;

  filePattern = filePattern || '*';
  rootPath = rootPath || startPath;
  callback = context ? _.bind(callback, context) : callback;
  pattern = new Minimatch(filePattern);

  return _.reduce(fs.readdirSync(startPath), function (results, fileName) {
    var absPath = resolvePath(startPath, fileName);

    if (isDirectory(absPath))
      results = results.concat(recurse(absPath, callback, filePattern, context, rootPath));
    else if (isFile(absPath) && pattern.match(fileName))
      results.push(callback(absPath, fileName, dirName(absPath), rootPath));

    return results;
  }, []);
};

/**
 * Makes a directory at the specified path
 *
 * @param {string} destPath the destination path to make
 */
exports.mkdir = function mkdir(destPath) {
  if (exists(destPath)) return;
  return fs.mkdirSync(destPath);
};

/**
 *
 * @param filePath
 * @param {string} [encoding]
 * @returns {*}
 */
var readFile = exports.readFile = function (filePath, encoding) {
  encoding = encoding || 'utf8';
  return fs.readFileSync(filePath, {
    encoding: encoding,
    flags: 'r'
  });
};

/**
 *
 * @param filePath
 * @param contentsToWrite
 * @param {string} [encoding]
 * @returns {*}
 */
var writeFile = exports.writeFile = function (filePath, contentsToWrite, encoding) {
  encoding = encoding || 'utf8';
  return fs.writeFileSync(filePath, contentsToWrite, {
    encoding: encoding,
    flags: 'rw'
  });
};

/**
 *
 * @param sourceFilePath
 * @param destinationFilePath
 * @param {string} [encoding]
 * @returns {*}
 */
var copyFile = exports.copyFile = function (sourceFilePath, destinationFilePath, encoding) {
  return writeFile(destinationFilePath, readFile(sourceFilePath, encoding), encoding);
};

/**
 *
 * @param filePath
 * @returns {*}
 */
var readJSON = exports.readJSON = function (filePath) {
  return JSON.parse(readFile(filePath));
};

/**
 * Writes the specified data as JSON to the specified file
 *
 * @param {Path} filePath - the path to the destination file to write
 * @param {*} data - the data to be written out as JSON
 * @param {boolean} [prettify] - <code>true</code> if the output must be prettified
 *                               <code>false</code> otherwise. Defaults to <code>false</code>
 * @returns {*}
 */
var writeJSON = exports.writeJSON = function (filePath, data, prettify) {
  var contentsToWrite = JSON.stringify(data, null, (prettify ? 2 : undefined));
  return writeFile(filePath, contentsToWrite);
};

/**
 * Deletes the file at the specified path
 *
 * @param {Path} filePath - the path of the file to be deleted
 */
exports.deleteFile = function (filePath) {
  if (!(exists(filePath))) return;
  return fs.unlinkSync(filePath);
};