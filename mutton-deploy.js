'use strict';

var async = require('async');
var AWS = require('aws-sdk');
var fs = require('fs');
var program = require('commander');
var files = require('./lib/files.js');
var nconf = require('nconf');

nconf.file('user', process.env.HOME + '/.mutton/conf.json');
nconf.env();
nconf.argv();
nconf.defaults({ mutton: { deployPath: '/tmp' } });

var muttonConfig = nconf.get('mutton');

AWS.config.region = muttonConfig.aws.region;

var deployment = require('./lib/deployment.js');

var sourcePath;
var deployPath = fs.realpathSync(muttonConfig.deployPath);
var pathFilter;

deployment.config.variables = muttonConfig.variables;

program.parse(process.argv);
sourcePath = fs.realpathSync(program.args[0] || '.');
pathFilter = program.args[1] || '**';

console.log('Path filter: ' + pathFilter);
console.log('Source path: ' + sourcePath);
console.log('Deploy path: ' + deployPath);
console.log('Target region: ' + muttonConfig.aws.region);

async.each(
  files.getFunctionDetailsList(sourcePath, deployPath, pathFilter),
  deployment.processFunction,
  deployment.complete
);
