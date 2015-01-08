// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
require('should');

describe('File handling library', function() {
  var files;
  var fs;
  var _;
  var wrench;

  beforeEach(function() {
    var filesFactory;

    _ = { filter: sinon.stub(), map: sinon.stub() };

    fs = {
      statSync: sinon.stub(),
      existsSync: sinon.stub(),
      realpathSync: sinon.stub()
    };

    wrench = { readdirSyncRecursive: sinon.stub() };

    filesFactory = proxyquire(
      '../../lib/files.js',
      {  lodash: _, fs: fs, wrench: wrench }
    );
    files = filesFactory('base-path', 'deploy-path');
  });

  describe('_isLambdaDirectory', function() {
    var completePath = 'base-path/relative-path';
    var configFilePath = completePath + '/lambda.json';
    var stat;

    beforeEach(function() {
      stat = { isDirectory: sinon.stub() };

      fs.statSync.returns(stat);
    });

    afterEach(function() {
      fs.statSync.callCount.should.equal(1);
      fs.statSync.args[0][0].should.equal(completePath);

      stat.isDirectory.callCount.should.equal(1);
    });

    it('returns true if a path is a directory with a config file', function() {
      stat.isDirectory.returns(true);
      fs.existsSync.returns(true);

      files._isLambdaDirectory('relative-path').should.be.true;

      fs.existsSync.callCount.should.equal(1);
      fs.existsSync.args[0][0].should.equal(configFilePath);
    });

    it('returns false if the path is not a directory', function() {
      stat.isDirectory.returns(false);

      files._isLambdaDirectory('relative-path').should.be.false;

      fs.existsSync.callCount.should.equal(0);
    });

    it('returns false if the path has no config file', function() {
      stat.isDirectory.returns(true);
      fs.existsSync.returns(false);

      files._isLambdaDirectory('relative-path').should.be.false;

      fs.existsSync.callCount.should.equal(1);
      fs.existsSync.args[0][0].should.equal(configFilePath);
    });
  });

  describe('_prepareFunctionDetails', function() {
    it('should generate basic function details', function() {
      fs.realpathSync.returns('source-path');

      files._prepareFunctionDetails('function-name').should.eql(
        {
          functionName: 'function-name',
          sourcePath: 'source-path',
          archivePath: 'deploy-path/function-name.zip',
          configPath: 'source-path/lambda.json'
        }
      );

      fs.realpathSync.callCount.should.equal(1);
      fs.realpathSync.args[0][0].should.equal('base-path/function-name');
    });
  });

  describe('_getLambdaDirectoryList', function() {
    it('should return a list of Lambda source directories', function() {
      wrench.readdirSyncRecursive.returns('dir-list');
      _.filter.returns('filter-return');

      files._getLambdaDirectoryList('base-path').should.equal('filter-return');

      wrench.readdirSyncRecursive.callCount.should.equal(1);
      wrench.readdirSyncRecursive.args[0][0].should.equal('base-path');

      _.filter.callCount.should.equal(1);
      _.filter.args[0][0].should.equal('dir-list');
      _.filter.args[0][1].should.equal(files._isLambdaDirectory);
    });
  });

  describe('getFunctionDetailsList', function() {
    it('should generate details for all lambda directories', function() {
      _.map.returns('map-return');

      files._getLambdaDirectoryList = sinon.stub();
      files._getLambdaDirectoryList.returns('dir-list');

      files.getFunctionDetailsList('base-path').should.equal('map-return');

      _.map.callCount.should.equal(1);
      _.map.args[0][0].should.equal('dir-list');
      _.map.args[0][1].should.equal(files._prepareFunctionDetails);
    });
  });
});
