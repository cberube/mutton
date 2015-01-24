// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Mutton deploy sub-command', function() {
  var async;
  var aws;
  var nconf;
  var commander;
  var deployment = { processFunction: 'process', complete: 'complete' };
  var fs;
  var files;
  var functionDetailList = { };

  var configData = {
    sourcePath: 'source-path',
    deployPath: 'deploy-path',
    aws: {
      region: 'aws-region'
    }
  };

  beforeEach(function() {
    async = { each: sinon.stub() };
    aws = { config: { } };
    nconf = {
      argv: sinon.spy(),
      defaults: sinon.spy(),
      env: sinon.spy(),
      file: sinon.spy(),
      get: sinon.stub()
    };
    commander = { parse: sinon.stub(), args: [ ] };
    files = { getFunctionDetailsList: sinon.stub() };
    fs = { realpathSync: sinon.stub() };

    nconf.get.returns(configData);

    fs.realpathSync.onCall(0).returns('real-deploy-path');
    fs.realpathSync.onCall(1).returns('real-source-path');

    files.getFunctionDetailsList.returns(functionDetailList);

    sinon.stub(console, 'log');

    proxyquire(
      '../mutton-deploy.js',
      {
        async: async,
        'aws-sdk': aws,
        commander: commander,
        nconf: nconf,
        fs: fs,
        './lib/deployment.js': deployment,
        './lib/files.js': files
      }
    );
  });

  afterEach(function() {
    console.log.restore();
  });

  describe('Configuration process', function() {
    it('should use nconf to gather configuration data', function() {
      nconf.get.callCount.should.equal(1);
    });

    it('should request the real path to the work directories', function() {
      fs.realpathSync.callCount.should.equal(2);
      should.equal(fs.realpathSync.args[0][0], 'deploy-path');
      should.equal(fs.realpathSync.args[1][0], '.');
    });

    it('should configure the AWS region', function() {
      aws.config.region.should.be.a.String;
      aws.config.region.should.equal('aws-region');
    });
  });

  describe('Execution', function() {
    it('should log configuration information', function() {
      console.log.callCount.should.equal(4);
      should.equal(console.log.args[0][0], 'Path filter: **');
      should.equal(console.log.args[1][0], 'Source path: real-source-path');
      should.equal(console.log.args[2][0], 'Deploy path: real-deploy-path');
      should.equal(console.log.args[3][0], 'Target region: aws-region');
    });

    it('should process a list of function details', function() {
      files.getFunctionDetailsList.callCount.should.equal(1);
      should.equal(files.getFunctionDetailsList.args[0][0], 'real-source-path');
      should.equal(files.getFunctionDetailsList.args[0][1], 'real-deploy-path');
      should.equal(files.getFunctionDetailsList.args[0][2], '**');

      async.each.callCount.should.equal(1);
      should.equal(async.each.args[0][0], functionDetailList);
      should.equal(async.each.args[0][1], deployment.processFunction);
      should.equal(async.each.args[0][2], deployment.complete);
    });
  });
});
