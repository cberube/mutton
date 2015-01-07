'use strict';

var async = require('async');
var AWS = require('aws-sdk');
var config = require('config');
var fs = require('fs');
var program = require('commander');

var muttonConfig = config.get('mutton');

var sourcePath = fs.realpathSync(muttonConfig.sourcePath);
var deployPath = fs.realpathSync(muttonConfig.deployPath);

AWS.config.region = muttonConfig.aws.region;

var deployment = require('./lib/deployment.js')(AWS);
var files = require('./lib/files.js')(sourcePath, deployPath);

console.log('Source path: ' + sourcePath);
console.log('Deploy path: ' + deployPath);
console.log('Target region: ' + muttonConfig.aws.region);

async.each(
  files.getFunctionDetailsList(sourcePath),
  deployment.processFunction,
  deployment.complete
);
