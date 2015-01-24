'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var async = require('async');
var logFilterFactory = require('./logFilterFactory');

module.exports = function(logGroupName, startTime, requestId) {
  var logFilter = logFilterFactory(requestId);
  var logs = new AWS.CloudWatchLogs();
  var logStreamLocator = {
    _logStreamForRequestId: undefined,
    _streamList: [ ]
  };

  /**
   * Test function which returns true when a log stream matching the configured
   * request ID has been located.
   *
   * @returns {boolean} True if we found a log stream, false otherwise
   * @private
   */
  logStreamLocator._requestStreamHasBeenFound = function() {
    return !_.isEmpty(logStreamLocator._logStreamForRequestId);
  };

  /**
   * Passes the log stream associated with the configured request ID out to
   * the given callback function.
   *
   * @param {function} callback
   * @private
   */
  logStreamLocator._logStreamFound = function(callback, error) {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    callback(null, logStreamLocator._logStreamForRequestId);
  };

  /**
   * Tests the given event to see if it is a START event for the configured
   * request ID -- if so, the log stream that contains the event is recorded
   * as the log stream associated with the request ID and the iteration over
   * the events in the stream is stopped.
   *
   * @param {object} stream The stream the event came from
   * @param {object} event The event to examine
   * @returns {boolean} False is returned to halt iteration
   * @private
   */
  logStreamLocator._testForStartEvent = function(stream, event) {
    if (logFilter.isStartEvent(event)) {
      logStreamLocator._logStreamForRequestId = stream.logStreamName;
    }
  };

  /**
   * Accepts and processes the results of requesting a list of events from a
   * log stream -- each event is examined to determine if it represents a
   * START event for the configured request ID. If an error occurs while
   * requesting the events from the stream it is propagated to the given
   * callback function.
   *
   * @param {*} err
   * @param {object} data The object containing the events from the stream
   * @param {object} stream The log stream the events were requested from
   * @param {function} callback
   * @private
   */
  logStreamLocator._searchStreamForStartEvent = function(
    err,
    data,
    stream,
    callback
  ) {
    if (!err) {
      _.each(
        data.events,
        _.partial(logStreamLocator._testForStartEvent, stream)
      );
    }

    callback(err);
  };

  /**
   * Searches a single log stream for a START event for the configured
   * request ID
   *
   * @param {object} stream
   * @param {function} callback
   * @private
   */
  logStreamLocator._searchStreamForRequest = function(stream, callback) {
    logs.getLogEvents(
      {
        logGroupName: logGroupName,
        logStreamName: stream.logStreamName,
        startFromHead: true,
        startTime: startTime
      },
      _.partialRight(
        logStreamLocator._searchStreamForStartEvent,
        stream,
        callback
      )
    );
  };

  /**
   * Searches through all the available log streams to see if one of them
   * contains a START event for the configured request ID.
   *
   * @param {function} callback
   * @private
   */
  logStreamLocator._searchStreamsForRequestId = function(callback) {
    async.eachSeries(
      logStreamLocator._streamList,
      logStreamLocator._searchStreamForRequest,
      callback
    );
  };

  /**
   * Updates the internal list of log streams in the configured log group. If
   * an error occurs, it is propagated to the given callback function.
   *
   * @param {*} err
   * @param {object} data
   * @param {function} callback
   * @private
   */
  logStreamLocator._logStreamsReceived = function(err, data, callback) {
    if (!err) {
      logStreamLocator._streamList = data.logStreams;
    }

    callback(err);
  };

  /**
   * Requests a list of all log streams in the configured log group.
   *
   * @param {function} callback
   * @private
   */
  logStreamLocator._getLogStreams = function(callback) {
    logs.describeLogStreams(
      { logGroupName: logGroupName },
      _.partialRight(logStreamLocator._logStreamsReceived, callback)
    );
  };

  /**
   * Updates the list of log streams for the log group, then checks each stream
   * to see if it contains a START event for the request ID.
   *
   * @param {function} callback
   * @private
   */
  logStreamLocator._checkForStartEvent = function(callback) {
    async.series(
      [
        logStreamLocator._getLogStreams,
        logStreamLocator._searchStreamsForRequestId
      ],
      callback
    );
  };

  /**
   * Searches through all the CloudWatch log streams in the given log group
   * until one is found which contains a START event for the given request ID.
   * On success, the callback function is called with (null, [logStreamName]),
   * where [logStreamName] is the name of the log stream that contained the
   * start event for the request ID.
   *
   * @param {function} callback
   */
  logStreamLocator.getLogStreamForRequestId = function(callback) {
    async.until(
      logStreamLocator._requestStreamHasBeenFound,
      _.partial(_.delay, logStreamLocator._checkForStartEvent, 5000),
      _.partial(logStreamLocator._logStreamFound, callback)
    );
  };

  return logStreamLocator;
};
