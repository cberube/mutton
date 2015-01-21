'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var async = require('async');
var logStreamLocatorFactory = require('./logStreamLocatorFactory');
var endOfInvocationMonitorFactory = require('./endOfInvocationMonitorFactory');

module.exports = function(invocationTask) {
  var endOfInvocationMonitor = endOfInvocationMonitorFactory(invocationTask);
  var logStreamLocator = logStreamLocatorFactory(
    '/aws/lambda/' + invocationTask.functionName,
    invocationTask.startTime,
    invocationTask.requestId
  );

  var logMonitor = { };

  /**
   * Handler function called when the log stream associated with the invocation
   * task has been found.
   *
   * @param {object} logStream
   * @param {function} callback
   * @private
   */
  logMonitor._logStreamFound = function(logStream, callback) {
    invocationTask.logStream = logStream;
    callback();
  };

  /**
   * Monitors the CloudWatch logs for the function specified in the invocation
   * task and waits until one of the streams in that log group has received
   * a START event for the request ID specified in the invocation task.
   *
   * @param {function} callback
   */
  logMonitor.waitForStartEvent = function(callback) {
    console.log('Searching for log stream...');

    async.waterfall(
      [
        logStreamLocator.getLogStreamForRequestId,
        logMonitor._logStreamFound
      ],
      callback
    );
  };

  /**
   * Monitors the log stream associated with the invocation task and waits
   * until an END event has been received with a request ID matching the
   * one specified in the invocation task.
   *
   * @param callback
   */
  logMonitor.waitForEndEvent = function(callback) {
    console.log('Waiting for END log...');
    endOfInvocationMonitor.waitForEndEvent(callback);
  };

  return logMonitor;
};
