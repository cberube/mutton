'use strict';

var _ = require('lodash');
var async = require('async');
var AWS = require('aws-sdk');
var files = require('./lib/files.js');
var nconf = require('nconf');

var configurationPath = process.env.HOME + '/mutton.conf.json';
var defaultConfig = {
  deployPath: '/tmp',
  aws: { region: 'us-west-2' },
  variables: { }
};

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
