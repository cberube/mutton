'use strict';

var _ = require('lodash');
var async = require('async');
var AWS = require('aws-sdk');
var deployment = require('./lib/deployment.js');
var eventLoader = require('./lib/eventLoader');
var files = require('./lib/files.js');
var invocationHelperFactory = require('./lib/invocationHelperFactory');
var moment = require('moment-timezone');
var nconf = require('nconf');
var outputHelper = require('./lib/outputHelper');
var program = require('commander');

var event;
var eventTemplatePath;
var functionName;
var invocationHelper;
var muttonConfig;

// Gather configuration data and setup internal configuration objects
nconf.file('user', process.env.HOME + '/.mutton/conf.json');
nconf.env().argv();
nconf.defaults({ mutton: { deployPath: '/tmp' } });

muttonConfig = nconf.get('mutton');

AWS.config.region = muttonConfig.aws.region;
deployment.config.variables = muttonConfig.variables;

// Gather command-line parameters
program.parse(process.argv);
functionName = program.args[0];
eventTemplatePath = program.args[1];

invocationHelper = invocationHelperFactory();

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
outputHelper.displayBlock('Event object', JSON.stringify(event));

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
