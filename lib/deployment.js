'use strict';

var _ = require('lodash');
var async = require('async');
var childProcess = require('child_process');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

module.exports = function(AWS) {
  var deployment = {};
  var lambda = new AWS.Lambda();

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

    // Note that 'partialRight' is not sufficient to assign the callback here,
    // because 'childProcess.exec' actually sends 3 arguments to the callback:
    // error, stdout, and stderr -- we only care about 'error', but the other
    // two interfere with currying the arguments
    childProcess.exec(
      zipCommand,
      { cwd: functionDetails.sourcePath },
      function(error) {
        callback(error, functionDetails);
      }
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

  return deployment;
};
