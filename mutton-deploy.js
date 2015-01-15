'use strict';

var async = require('async');
var AWS = require('aws-sdk');
var config = require('config');
var fs = require('fs');
var program = require('commander');
var files = require('./lib/files.js');

var muttonConfig = config.get('mutton');

AWS.config.region = muttonConfig.aws.region;

var deployment = require('./lib/deployment.js');

var sourcePath = fs.realpathSync(muttonConfig.sourcePath);
var deployPath = fs.realpathSync(muttonConfig.deployPath);
var pathFilter;

deployment.config.variables = muttonConfig.variables;

program.parse(process.argv);
pathFilter = program.args[0] || '**';

console.log('Path filter: ' + pathFilter);
console.log('Source path: ' + sourcePath);
console.log('Deploy path: ' + deployPath);
console.log('Target region: ' + muttonConfig.aws.region);

async.each(
  files.getFunctionDetailsList(sourcePath, deployPath, pathFilter),
  deployment.processFunction,
  deployment.complete
);
