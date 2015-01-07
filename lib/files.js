'use strict';

var _ = require('lodash');
var fs = require('fs');
var wrench = require('wrench');

module.exports = function(basePath, deployPath) {
  var files = {};

  /**
   * Determines if the given relative path inside the base path contains a
   * 'lambda.json' configuration file.
   *
   * @param {string} relativePath
   * @returns {bool}
   * @private
   */
  files._isLambdaDirectory = function(relativePath) {
    var completePath = basePath + '/' + relativePath;
    var configFilePath = completePath + '/lambda.json';

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
   * @param {string} functionName
   * @returns {object}
   * @private
   */
  files._prepareFunctionDetails = function(functionName) {
    var sourcePath = fs.realpathSync(basePath + '/' + functionName);

    return {
      functionName: functionName,
      sourcePath: sourcePath,
      archivePath: deployPath + '/' + functionName + '.zip',
      configPath: sourcePath + '/lambda.json'
    };
  };

  /**
   * Returns an array of directories inside the base path which have lambda
   * configuration files inside them. This is the list of directories
   * containing functions to be deployed to AWS.
   *
   * @param basePath
   * @returns {Array}
   * @private
   */
  files._getLambdaDirectoryList = function(basePath) {
    return _.filter(
      wrench.readdirSyncRecursive(basePath),
      files._isLambdaDirectory
    );
  };

  /**
   * Returns an array of objects describing the functions to be uploaded to AWS.
   *
   * @param {string} basePath
   * @returns {Array}
   */
  files.getFunctionDetailsList = function(basePath) {
    return _.map(
      files._getLambdaDirectoryList(basePath),
      files._prepareFunctionDetails
    );
  };

  return files;
};
