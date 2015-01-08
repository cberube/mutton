'use strict';

var _ = require('lodash');
var async = require('async');
var AWS = require('aws-sdk');
var childProcess = require('child_process');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

var deployment = {};
var lambda = new AWS.Lambda();

/**
 * Handles the result of the child_process.exec call used to generate the
 * function's ZIP file. Because of the extra stdout and stderr arguments
 * to this callback it is a bit of a hassle to pass through the interesting
 * data to the incoming callback.
 *
 * @param {*} error
 * @param {Buffer} stdout
 * @param {Buffer} stderr
 * @param {Object} functionDetails
 * @param {Function} callback
 * @private
 */
deployment._zipComplete = function(
  error,
  stdout,
  stderr,
  functionDetails,
  callback
) {
  callback(error, functionDetails);
};

/**
 * Creates a ZIP file containing all the files required for the Lambda
 * function defined by the given functionDetails object.
 *
 * @param {object} functionDetails
 * @param {function} callback
 */
deployment.packageFunction = function(functionDetails, callback) {
  var zipCommand = 'zip -r ' + functionDetails.archivePath + ' .';

  mkdirp.sync(path.dirname(functionDetails.archivePath));

  childProcess.exec(
    zipCommand,
    { cwd: functionDetails.sourcePath },
    _.partialRight(deployment._zipComplete, functionDetails, callback)
  );
};

/**
 * Uploads the ZIP archive for the specified Lambda function functionDetails.
 *
 * @param {object} functionDetails
 * @param {function} callback
 */
deployment.uploadFunction = function(functionDetails, callback) {
  var parameters = {
    Mode: 'event',
    Runtime: 'nodejs',
    FunctionZip: fs.readFileSync(functionDetails.archivePath),
    FunctionName: functionDetails.config.FunctionName,
    Role: functionDetails.config.Role,
    Handler: functionDetails.config.Handler,
    Timeout: functionDetails.config.Timeout,
    MemorySize: functionDetails.config.MemorySize,
    Description: functionDetails.config.Description
  };

  lambda.uploadFunction(parameters, callback);
};

/**
 * Loads the 'lambda.json' functionDetails file specified in the incoming
 * functionDetails object and stores the resulting values in the 'config'
 * element of the functionDetails object.
 *
 * @param {object} functionDetails
 * @param {function} callback
 */
deployment.loadConfigurationFile = function(functionDetails, callback) {
  var config = {};

  try {
    config = JSON.parse(fs.readFileSync(functionDetails.configPath));
  } catch (ex) {
    callback(
      'Failed to parse configuration file ' +
      functionDetails.configPath + '\n\t' + ex
    );
    return;
  }

  functionDetails.config = config;
  callback(null, functionDetails);
};

/**
 * Processes a single Lambda function described by the given details object.
 * This will load the lambda.json file for the given function, create an
 * archive of the required files, and upload the archive to AWS.
 *
 * @param {object} functionDetails
 * @param {function} callback
 */
deployment.processFunction = function(functionDetails, callback) {
  async.waterfall(
    [
      async.apply(deployment.loadConfigurationFile, functionDetails),
      deployment.packageFunction,
      deployment.uploadFunction
    ],
    callback
  );
};

/**
 * The callback function to invoke when all of the functions currently being
 * deployed have been processed.
 *
 * @param {*} err
 */
deployment.complete = function(err) {
  if (err) {
    console.error(err);
    return;
  }

  console.log('Deployment completed');
};

module.exports = deployment;
