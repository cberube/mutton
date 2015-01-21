'use strict';

var _ = require('lodash');
var async = require('async');
var AWS = require('aws-sdk');
var config = require('config');
var files = require('./lib/files.js');
var program = require('commander');
var moment = require('moment-timezone');
var eventLoader = require('./lib/eventLoader');

var outputHelper = require('./lib/outputHelper');
var invocationHelperFactory = require('./lib/invocationHelperFactory');
var invocationHelper;

var muttonConfig = config.get('mutton');

AWS.config.region = muttonConfig.aws.region;

invocationHelper = invocationHelperFactory();

var deployment = require('./lib/deployment.js');

deployment.config.variables = muttonConfig.variables;

program.parse(process.argv);

var event;

var functionName = program.args[0];
var eventTemplatePath = program.args[1];

function displayEvents(invocationTask, callback) {
  console.log('\n--------------------------------------------------\n');

  _.each(invocationTask.eventList, function(event) {
    var text;

    text = moment.tz(event.timestamp, 'UTC').format() + ': ' + event.message;
    console.log(text);
  });

  console.log('\n--------------------------------------------------\n');

  callback();
}

event = eventLoader.loadEventTemplate(
  eventTemplatePath,
  deployment.config.variables
);
outputHelper.displayBlock('Event object', event);

function monitorExecution(invocationTask, callback) {
  async.series(
    [
      invocationTask.logMonitor.waitForStartEvent,
      invocationTask.logMonitor.waitForEndEvent,
      invocationTask.logCollector.collectEvents,
      _.partial(displayEvents, invocationTask)
    ],
    _.partialRight(callback, invocationTask)
  );
}

async.waterfall(
  [
    _.partial(invocationHelper.invokeLambdaFunction, functionName, event),
    monitorExecution
  ],
  function(err) {
    if (err) {
      console.error('Error occurred while testing!', err);
      return;
    }

    console.log('Test complete.');
  }
);
