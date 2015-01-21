'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var async = require('async');
var logFilterFactory = require('./logFilterFactory');
var logStreamLocatorFactory = require('./logStreamLocatorFactory');

module.exports = function(invocationTask) {
  var logs = new AWS.CloudWatchLogs();
  var logStreamLocator = logStreamLocatorFactory(
    '/aws/lambda/' + invocationTask.functionName,
    invocationTask.startTime,
    invocationTask.requestId
  );
  var foundEnd = false;

  var logFilter = logFilterFactory(invocationTask.requestId);

  var logMonitor = { };

  logMonitor._logStreamFound = function(logStream, callback) {
    console.log('FOUND ' + logStream);

    invocationTask.logStream = logStream;
    callback();
  };

  function _testForEndEvent(event) {
    if (logFilter.isEndEvent(event)) {
      foundEnd = true;
    }
  }

  function _checkLogEventsForEndEvent(err, data, callback) {
    if (err) {
      callback(err);
      return;
    }

    _.each(
      data.events,
      _testForEndEvent
    );

    callback(null);
  }

  function _checkForEndEvent(callback) {
    logs.getLogEvents(
      {
        logGroupName: '/aws/lambda/' + invocationTask.functionName,
        logStreamName: invocationTask.logStream,
        startFromHead: true,
        startTime: invocationTask.startTime
      },
      _.partialRight(
        _checkLogEventsForEndEvent,
        callback
      )
    );
  }

  return {
    waitForStartEvent: function(callback) {
      console.log('Waiting for START log...');

      async.waterfall(
        [
          logStreamLocator.getLogStreamForRequestId,
          logMonitor._logStreamFound
        ],
        callback
      );
    },

    waitForEndEvent: function(callback) {
      console.log('Waiting for END log...');

      async.until(
        function() {
          return foundEnd;
        },
        function(untilCallback) {
          setTimeout(_.partial(_checkForEndEvent, untilCallback), 1000);
        },
        callback
      );
    }
  };
};
