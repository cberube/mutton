// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Mutton deploy sub-command', function() {
  var configData = {
    sourcePath: 'source-path',
    deployPath: 'deploy-path',
    aws: {
      region: 'aws-region'
    }
  };

  var async;
  var aws;
  var config;
  var fs;
  var deployment;
  var files;
  var filesFactory;
  var commander;

  function requireTestSubject() {
    proxyquire(
      '../mutton-deploy.js',
      {
        async: async,
        'aws-sdk': aws,
        config: config,
        fs: fs,
        './lib/deployment.js': deployment,
        './lib/files.js': filesFactory,
        commander: commander
      }
    );
  }

  beforeEach(function() {
    async = { each: sinon.stub() };
    aws = { config: { } };
    config = { get: sinon.stub() };
    fs = { realpathSync: sinon.stub() };
    deployment = {
      processFunction: 'process-function',
      complete: 'complete'
    };
    files = { getFunctionDetailsList: sinon.stub() };
    commander = { parse: sinon.stub(), args: [ ] };

    filesFactory = sinon.stub();
    filesFactory.returns(files);

    config.get = sinon.stub();
    fs.realpathSync = sinon.stub();

    config.get.returns(configData);

    sinon.stub(console, 'log');
  });

  afterEach(function() {
    console.log.restore();
  });

  it('should use config to gather configuration data', function() {
    requireTestSubject();

    config.get.callCount.should.equal(1);
  });

  it('should request the real path to the work directories', function() {
    requireTestSubject();

    fs.realpathSync.callCount.should.equal(2);
    fs.realpathSync.args[0][0].should.equal('source-path');
    fs.realpathSync.args[1][0].should.equal('deploy-path');
  });

  it('should configure the AWS region', function() {
    requireTestSubject();

    aws.config.region.should.be.a.String;
    aws.config.region.should.equal('aws-region');
  });

  it('should inject the deploy path into the files factory', function() {
    fs.realpathSync.onCall(0).returns('real-source-path');
    fs.realpathSync.onCall(1).returns('real-deploy-path');

    requireTestSubject();

    filesFactory.callCount.should.equal(1);
  });

  it('should log configuration information', function() {
    fs.realpathSync.onCall(0).returns('real-source-path');
    fs.realpathSync.onCall(1).returns('real-deploy-path');

    requireTestSubject();

    console.log.callCount.should.equal(4);
    console.log.args[0][0].should.equal('Path filter: **');
    console.log.args[1][0].should.equal('Source path: real-source-path');
    console.log.args[2][0].should.equal('Deploy path: real-deploy-path');
    console.log.args[3][0].should.equal('Target region: aws-region');
  });

  it('should process a list of function details', function() {
    var functionDetailList = {};

    fs.realpathSync.returns('real-source-path');
    files.getFunctionDetailsList.returns(functionDetailList);

    requireTestSubject();

    files.getFunctionDetailsList.callCount.should.equal(1);
    files.getFunctionDetailsList.args[0][0].should.equal('real-source-path');

    async.each.callCount.should.equal(1);
    async.each.args[0][0].should.equal(functionDetailList);
    async.each.args[0][1].should.equal(deployment.processFunction);
    async.each.args[0][2].should.equal(deployment.complete);
  });
});
