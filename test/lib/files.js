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
      dirname: sinon.stub(),
      join: sinon.stub(),
      relative: sinon.stub()
    };

    files = proxyquire(
      '../../lib/files.js',
      {  lodash: _, fs: fs, glob: glob, path: path }
    );
  });

  describe('_prepareFunctionDetails', function() {
    it('should generate basic function details', function() {
      path.dirname.returns('dir-name');
      path.relative.returns('relative');
      path.join.returns('join');

      should.deepEqual(
        files._prepareFunctionDetails(
          'base-path',
          'deploy-path',
          'config-path'
        ),
        {
          sourcePath: 'dir-name',
          archivePath: 'join',
          configPath: 'config-path'
        }
      );

      path.dirname.callCount.should.equal(1);
      should.equal(path.dirname.args[0][0], 'config-path');

      path.relative.callCount.should.equal(1);
      should.equal(path.relative.args[0][0], 'base-path');
      should.equal(path.relative.args[0][1], 'dir-name');

      path.join.callCount.should.equal(1);
      should.equal(path.join.args[0][0], 'deploy-path');
      should.equal(path.join.args[0][1], 'relative.zip');
    });
  });

  describe('getFunctionDetailsList', function() {
    it('should generate details for all lambda directories', function() {
      _.map.returns('map-return');
      _.partial.returns('partial');

      glob.sync.returns('dir-list');

      should.equal(
        files.getFunctionDetailsList('base-path', 'deploy-path'),
        'map-return'
      );

      _.partial.callCount.should.equal(1);
      should.equal(_.partial.args[0][0], files._prepareFunctionDetails);
      should.equal(_.partial.args[0][1], 'base-path');
      should.equal(_.partial.args[0][2], 'deploy-path');

      _.map.callCount.should.equal(1);
      should.equal(_.map.args[0][0], 'dir-list');
      should.equal(_.map.args[0][1], 'partial');
    });
  });
});
