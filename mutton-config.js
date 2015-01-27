'use strict';

var _ = require('lodash');
var async = require('async');
var AWS = require('aws-sdk');
var files = require('./lib/files.js');
var fs = require('fs');
var nconf = require('nconf');

var configurationDirectory = process.env.HOME + '/.mutton';
var configurationPath = configurationDirectory + '/conf.json';
var defaultConfig = {
  deployPath: '/tmp',
  aws: { region: 'us-west-2' },
  variables: { }
};

// Ensure the target directory exists (mode is 0755)
fs.mkdirSync(configurationDirectory, 493);

nconf.file({ file: configurationPath });
nconf.merge('mutton', _.extend(defaultConfig, nconf.get('mutton')));

nconf.save(
  function(err) {
    if (err) {
      console.error('Unable to save configuration file!');
      console.error(err);
      process.exit(1);
    }

    console.log('Saved configuration at ' + configurationPath);
    process.exit(0);
  }
);
