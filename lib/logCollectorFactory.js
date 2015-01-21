'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var logFilterFactory = require('./logFilterFactory');

/**
 * This factory generates a collector object which can be used to gather all
 * the logs related to a particular invocation task, provided that the correct
 * log stream for the task has been detected.
 *
 * @param {object} invocationTask
 */
module.exports = function(invocationTask) {
  var logFilter = logFilterFactory(invocationTask.requestId);
  var logs = new AWS.CloudWatchLogs();

  var logCollector = {
    insideRequestLogs: false
  };

  /**
   * Accepts a response from a request for CloudWatch log events and processes
   * each event, collecting all events between the start and end marker for
   * the current invocation task.
   *
   * @param {*} err The error from the log request, if any
   * @param {object} data The object containing the results of the request
   * @param {function} callback
   * @private
   */
  logCollector._receivedEvents = function(err, data, callback) {
    logCollector.insideRequestLogs = false;

    if (!err) {
      _.each(data.events, logCollector._processEvent);
    }

    callback(err);
  };

  /**
   * Examines a single CloudWatch log event and determines if it is the start
   * or end marker event. If it is the start event, the `insideRequestLogs`
   * flag is updated and this function will begin collecting events from the
   * current invocation task; if it is the end event the flag is reset and
   * iteration through the remaining events is prevented.
   *
   * @param {object} event The CloudWatch event to examine
   * @returns {boolean} False is returned to stop iterating through the events
   * @private
   */
  logCollector._processEvent = function(event) {
    if (logFilter.isStartEvent(event)) {
      logCollector.insideRequestLogs = true;
    }

    if (logCollector.insideRequestLogs) {
      invocationTask.eventList.push(event);
    }

    if (logFilter.isEndEvent(event)) {
      logCollector.insideRequestLogs = false;
      return false;
    }
  };

  /**
   * Requests the events from the CloudWatch log stream associated with the
   * given invocation task and collects all those events which appear between
   * the start and end marker events in the logs.
   *
   * @param {function} callback
   */
  logCollector.collectEvents = function(callback) {
    console.log('Collecting log events...');

    logs.getLogEvents(
      {
        logGroupName: '/aws/lambda/' + invocationTask.functionName,
        logStreamName: invocationTask.logStream,
        startFromHead: true,
        startTime: invocationTask.startTime
      },
      _.partialRight(logCollector._receivedEvents, callback)
    );
  };

  return logCollector;
};
