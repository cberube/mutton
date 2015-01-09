'use strict';

var _ = require('lodash');
var fs = require('fs');
var glob = require('glob');
var path = require('path');

var files = {};

/**
 * Assembles the basic function detail object for the given directory. The
 * expectation is that the incoming directory name is also the desired
 * function name.
 *
 * @param {string} basePath
 * @param {string} deployPath
 * @param {string} configPath The path to the lambda.json file
 * @returns {object}
 * @private
 */
files._prepareFunctionDetails = function(basePath, deployPath, configPath) {
  var sourcePath = path.dirname(configPath);
  var relativePath = path.relative(basePath, sourcePath);
  var archivePath = path.join(deployPath, relativePath + '.zip');

  return {
    sourcePath: sourcePath,
    archivePath: archivePath,
    configPath: configPath
  };
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
  var configFileGlob = path.join(basePath, globPattern + '/lambda.json');

  return _.map(
    glob.sync(configFileGlob),
    _.partial(files._prepareFunctionDetails, basePath, deployPath)
  );
};

module.exports = files;
