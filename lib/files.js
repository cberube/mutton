'use strict';

var _ = require('lodash');
var fs = require('fs');
var glob = require('glob');
var path = require('path');

module.exports = function() {
  var files = {};

  /**
   * Determines if the given path is both a directory and contains a
   * lambda.json configuration file.
   *
   * @param {string} completePath The absolute path to check
   * @returns {bool}
   * @private
   */
  files._isLambdaDirectory = function(completePath) {
    var configFilePath = path.join(completePath, '/lambda.json');

    return (
      fs.statSync(completePath).isDirectory() &&
      fs.existsSync(configFilePath)
    );
  };

  /**
   * Assembles the basic function detail object for the given directory. The
   * expectation is that the incoming directory name is also the desired
   * function name.
   *
   * @param {string} basePath
   * @param {string} sourcePath
   * @param {string} deployPath
   * @returns {object}
   * @private
   */
  files._prepareFunctionDetails = function(basePath, deployPath, sourcePath) {
    var relativePath = path.relative(basePath, sourcePath);
    var archivePath = path.join(deployPath, relativePath + '.zip');

    return {
      sourcePath: sourcePath,
      archivePath: archivePath,
      configPath: sourcePath + '/lambda.json'
    };
  };

  /**
   * Returns an array of directories inside the base path which have lambda
   * configuration files inside them. This is the list of directories
   * containing functions to be deployed to AWS.
   *
   * @param {string} basePath
   * @param {string} globPattern
   * @returns {Array}
   * @private
   */
  files._getLambdaDirectoryList = function(basePath, globPattern) {
    return _.filter(
      glob.sync(path.join(basePath, globPattern)),
      files._isLambdaDirectory
    );
  };

  /**
   * Returns an array of objects describing the functions to be uploaded to AWS.
   *
   * @param {string} basePath
   * @param {string} deployPath
   * @param {string} globPattern
   * @returns {Array}
   */
  files.getFunctionDetailsList = function(basePath, deployPath, globPattern) {
    return _.map(
      files._getLambdaDirectoryList(basePath, globPattern),
      _.partial(files._prepareFunctionDetails, basePath, deployPath)
    );
  };

  return files;
};
