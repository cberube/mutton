// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Library: File support', function() {
  var files;
  var fs;
  var glob;
  var _;
  var path;

  beforeEach(function() {
    var filesFactory;

    _ = { filter: sinon.stub(), map: sinon.stub(), partial: sinon.stub() };

    fs = {
      statSync: sinon.stub(),
      existsSync: sinon.stub(),
      realpathSync: sinon.stub()
    };

    glob = {
      sync: sinon.stub()
    };

    path = {
      basename: sinon.stub(),
      join: sinon.stub(),
      relative: sinon.stub()
    };

    filesFactory = proxyquire(
      '../../lib/files.js',
      {  lodash: _, fs: fs, glob: glob, path: path }
    );

    files = filesFactory('deploy-path');
  });

  describe('_isLambdaDirectory', function() {
    var stat;

    beforeEach(function() {
      stat = { isDirectory: sinon.stub() };

      fs.statSync.returns(stat);
    });

    afterEach(function() {
      fs.statSync.callCount.should.equal(1);
      fs.statSync.args[0][0].should.equal('complete-path');

      stat.isDirectory.callCount.should.equal(1);
    });

    it('returns true if a path is a directory with a config file', function() {
      path.join.returns('path-join');

      stat.isDirectory.returns(true);
      fs.existsSync.returns(true);

      files._isLambdaDirectory('complete-path').should.be.true;

      fs.existsSync.callCount.should.equal(1);
      should.equal(fs.existsSync.args[0][0], 'path-join');
    });

    it('returns false if the path is not a directory', function() {
      stat.isDirectory.returns(false);

      files._isLambdaDirectory('complete-path').should.be.false;

      fs.statSync.callCount.should.equal(1);
      should.equal(fs.statSync.args[0][0], 'complete-path');

      fs.existsSync.callCount.should.equal(0);
    });

    it('returns false if the path has no config file', function() {
      path.join.returns('path-join');

      stat.isDirectory.returns(true);
      fs.existsSync.returns(false);

      files._isLambdaDirectory('complete-path').should.be.false;

      fs.existsSync.callCount.should.equal(1);
      fs.existsSync.args[0][0].should.equal('path-join');
    });
  });

  describe('_prepareFunctionDetails', function() {
    it('should generate basic function details', function() {
      path.relative.returns('relative-path');
      path.basename.returns('base-name');
      path.join.returns('path-join');

      fs.realpathSync.returns('real-path');

      should.deepEqual(
        files._prepareFunctionDetails(
          'base-path',
          'deploy-path',
          'source-path'
        ),
        {
          sourcePath: 'source-path',
          archivePath: 'path-join',
          configPath: 'source-path/lambda.json'
        }
      );

      path.relative.callCount.should.equal(1);
      should.equal(path.relative.args[0][0], 'base-path');
      should.equal(path.relative.args[0][1], 'source-path');

      path.join.callCount.should.equal(1);
      should.equal(path.join.args[0][0], 'deploy-path');
      should.equal(path.join.args[0][1], 'relative-path.zip');
    });
  });

  describe('_getLambdaDirectoryList', function() {
    it('should return a list of Lambda source directories', function() {
      glob.sync.returns('glob-sync');
      _.filter.returns('filter-return');

      files._getLambdaDirectoryList('base-path').should.equal('filter-return');

      _.filter.callCount.should.equal(1);
      _.filter.args[0][0].should.equal('glob-sync');
      _.filter.args[0][1].should.equal(files._isLambdaDirectory);
    });
  });

  describe('getFunctionDetailsList', function() {
    it('should generate details for all lambda directories', function() {
      _.map.returns('map-return');
      _.partial.returns('partial');

      files._getLambdaDirectoryList = sinon.stub();
      files._getLambdaDirectoryList.returns('dir-list');

      files.getFunctionDetailsList('base-path').should.equal('map-return');

      _.partial.callCount.should.equal(1);
      should.equal(_.partial.args[0][0], files._prepareFunctionDetails);
      should.equal(_.partial.args[0][1], 'base-path');

      _.map.callCount.should.equal(1);
      should.equal(_.map.args[0][0], 'dir-list');
      should.equal(_.map.args[0][1], 'partial');
    });
  });
});
