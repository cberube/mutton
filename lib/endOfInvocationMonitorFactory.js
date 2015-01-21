'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var async = require('async');
var logFilterFactory = require('./logFilterFactory');

module.exports = function(invocationTask) {
  var endOfInvocationMonitor = { hasEndBeenFound: false };
  var logFilter = logFilterFactory(invocationTask.requestId);
  var logs = new AWS.CloudWatchLogs();

  /**
   * Test function which returns true when an END event has been found four the
   * request ID specified in the invocation task.
   *
   * @returns {boolean} True when an END event has been found for the request ID
   * @private
   */
  endOfInvocationMonitor._hasEndBeenFound = function() {
    return endOfInvocationMonitor.hasEndBeenFound;
  };

  /**
   * Checks to see if the given event is an END event for the request ID in
   * the invocation task -- sets the hasEndBeenFound flag if so.
   *
   * @param {object} event
   * @private
   */
  endOfInvocationMonitor._testForEndEvent = function(event) {
    if (logFilter.isEndEvent(event)) {
      endOfInvocationMonitor.hasEndBeenFound = true;
    }
  };

  /**
   * Processes the response from a getLogEvents request and examines each
   * event in the response to see if it is an END marker for the request ID
   * specified in the current invocation task. If an error is returned from
   * the getLogEvents request it will be propagated up to the given callback.
   *
   * @param {*} err
   * @param {object} data
   * @param {function} callback
   * @private
   */
  endOfInvocationMonitor._searchForEndEvent = function(err, data, callback) {
    if (!err) {
      _.each(data.events, endOfInvocationMonitor._testForEndEvent);
    }

    callback(err);
  };

  /**
   * Requests updated logs from CloudWatch and checks to see if one of them
   * represents and END event for the request ID current configured in the
   * invocation task.
   *
   * @param {function} callback
   * @private
   */
  endOfInvocationMonitor._queryForEndEvent = function(callback) {
    logs.getLogEvents(
      {
        logGroupName: '/aws/lambda/' + invocationTask.functionName,
        logStreamName: invocationTask.logStream,
        startFromHead: true,
        startTime: invocationTask.startTime
      },
      _.partialRight(
        endOfInvocationMonitor._searchForEndEvent,
        callback
      )
    );
  };

  /**
   * Monitors the CloudWatch log stream associated with the current invocation
   * task and waits until an END event is detected.
   *
   * @param callback
   */
  endOfInvocationMonitor.waitForEndEvent = function(callback) {
    async.until(
      endOfInvocationMonitor._hasEndBeenFound,
      _.partial(_.delay, endOfInvocationMonitor._queryForEndEvent, 1000),
      callback
    );
  };

  return endOfInvocationMonitor;
};
