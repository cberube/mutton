'use strict';

var async = require('async');
var AWS = require('aws-sdk');
var config = require('config');
var fs = require('fs');
var program = require('commander');

var muttonConfig = config.get('mutton');

AWS.config.region = muttonConfig.aws.region;

var deployment = require('./lib/deployment.js');
var files = require('./lib/files.js')();
var pathFilter = '**';

var sourcePath = fs.realpathSync(muttonConfig.sourcePath);
var deployPath = fs.realpathSync(muttonConfig.deployPath);

program.parse(process.argv);

pathFilter = program.args[0] || pathFilter;

console.log('Path filter: ' + pathFilter);
console.log('Source path: ' + sourcePath);
console.log('Deploy path: ' + deployPath);
console.log('Target region: ' + muttonConfig.aws.region);

async.each(
  files.getFunctionDetailsList(sourcePath, deployPath, pathFilter),
  deployment.processFunction,
  deployment.complete
);
