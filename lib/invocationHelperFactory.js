'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var logMonitorFactory = require('./logMonitorFactory');
var logCollectorFactory = require('./logCollectorFactory');

module.exports = function() {
  var lambda = new AWS.Lambda();

  var invocationHelper = { };
  var invocationTask = { };

  invocationHelper._onInvokeComplete = function(
    response,
    invocationTask,
    callback
  ) {
    invocationTask.requestId =
      response.httpResponse.headers['x-amzn-requestid'];
    invocationTask.logMonitor = logMonitorFactory(invocationTask);
    invocationTask.logCollector = logCollectorFactory(invocationTask);

    callback(null, invocationTask);
  };

  invocationHelper.invokeLambdaFunction = function(functionName, event, callback) {
    invocationTask = {
      functionName: functionName,
      event: event,
      eventList: [ ],
      logMonitor: undefined,
      logCollector: undefined,
      requestId: undefined,
      startTime: 0
    };
    var request;

    console.log('Invoking: ' + functionName);

    request = lambda.invokeAsync(
      {
        FunctionName: functionName,
        InvokeArgs: JSON.stringify(event)
      }
    );

    request.on(
      'complete',
      _.partialRight(
        invocationHelper._onInvokeComplete,
        invocationTask,
        callback
      )
    );

    request.send();
  };

  return invocationHelper;
};
