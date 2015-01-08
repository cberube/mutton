// jshint -W030

'use strict';

var _ = require('lodash');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

var async = { };
var AWS = { Lambda: sinon.stub() };
var childProcess = { };
var fs = { };
var lambda = { };
var lodash = { };
var mkdirp = { };
var path = { };

AWS.Lambda.returns(lambda);

var deployment = proxyquire(
  '../../lib/deployment.js',
  {
    async: async,
    'aws-sdk': AWS,
    'child_process': childProcess,
    lodash: lodash,
    fs: fs,
    mkdirp: mkdirp,
    path: path
  }
);

describe('Library: Deployment support', function() {
  describe('_zipComplete', function() {
    it('should pass through the error and details to the callback', function() {
      var details = { };
      var callback = sinon.spy();

      deployment._zipComplete('error', 'stdout', 'stderr', details, callback);

      callback.callCount.should.equal(1);
      callback.args[0][0].should.equal('error');
      callback.args[0][1].should.equal(details);
    });
  });

  describe('packageFunction', function() {
    beforeEach(function() {
      childProcess.exec = sinon.stub();
      mkdirp.sync = sinon.stub();
      path.dirname = sinon.stub();
      lodash.partialRight = sinon.stub();
    });

    it(
      'should ensure the target directory exists, and generate a zip file',
      function() {
        var functionDetails = {
          sourcePath: 'source-path',
          archivePath: 'archive-path'
        };

        lodash.partialRight.returns('partial-right');

        path.dirname.returns('dir-name');

        deployment.packageFunction(functionDetails, 'callback');

        path.dirname.callCount.should.equal(1);

        mkdirp.sync.callCount.should.equal(1);
        mkdirp.sync.args[0][0].should.equal('dir-name');

        childProcess.exec.callCount.should.equal(1);
        childProcess.exec.args[0][0].should.equal('zip -r archive-path .');
        childProcess.exec.args[0][1].should.eql({ cwd: 'source-path' });
        childProcess.exec.args[0][2].should.equal('partial-right');

        lodash.partialRight.callCount.should.equal(1);
        lodash.partialRight.args[0][0].should.equal(deployment._zipComplete);
        lodash.partialRight.args[0][1].should.equal(functionDetails);
        lodash.partialRight.args[0][2].should.equal('callback');
      }
    );
  });

  describe('uploadFunction', function() {
    it('should call the AWS SDK with appropriate parameters', function() {
      var details = {
        archivePath: 'archive-path',
        config: {
          FunctionName: 'function-name',
          Role: 'role',
          Handler: 'handler',
          Timeout: 'timeout',
          MemorySize: 'memory-size',
          Description: 'description'
        }
      };

      var expectedParameters = _.extend(
        {
          Mode: 'event',
          Runtime: 'nodejs',
          FunctionZip: 'function-zip'
        },
        details.config
      );

      lambda.uploadFunction = sinon.stub();

      fs.readFileSync = sinon.stub();
      fs.readFileSync.returns('function-zip');

      deployment.uploadFunction(details, 'callback');

      lambda.uploadFunction.callCount.should.equal(1);
      lambda.uploadFunction.args[0][0].should.eql(expectedParameters);
      lambda.uploadFunction.args[0][1].should.equal('callback');
    });
  });

  describe('loadConfigurationFile', function() {
    var callback;
    var details;

    beforeEach(function() {
      callback = sinon.spy();
      details = { configPath: 'config-path' };
      sinon.stub(JSON, 'parse');
    });

    afterEach(function() {
      JSON.parse.restore();
    });

    it('should propagate an error if JSON parsing fails', function() {

      JSON.parse.throws('exception');

      deployment.loadConfigurationFile(details, callback);

      callback.callCount.should.equal(1);
      callback.args[0][0].should.equal(
        'Failed to parse configuration file config-path\n\texception'
      );
    });

    it('should update the details with the config data', function() {
      var expectedConfig = { configPath: 'config-path', config: 'config' };

      JSON.parse.returns('config');

      deployment.loadConfigurationFile(details, callback);

      callback.callCount.should.equal(1);
      should.not.exist(callback.args[0][0]);
      callback.args[0][1].should.eql(expectedConfig);
    });
  });

  describe('processFunction', function() {
    it(
      'should load the function config, then package and upload the function',
      function() {
        var details = { };

        async.waterfall = sinon.spy();
        async.apply = sinon.stub().returns('apply');

        deployment.processFunction(details, 'callback');

        async.waterfall.callCount.should.equal(1);
        should.deepEqual(
          async.waterfall.args[0][0],
          [
            'apply',
            deployment.packageFunction,
            deployment.uploadFunction
          ]
        );
        should.equal(async.waterfall.args[0][1], 'callback');
      }
    );
  });

  describe('complete', function() {
    beforeEach(function() {
      sinon.stub(console, 'log');
      sinon.stub(console, 'error');
    });

    afterEach(function() {
      console.log.restore();
      console.error.restore();
    });

    it('should log any error', function() {
      deployment.complete('error');

      console.error.callCount.should.equal(1);
      should.equal(console.error.args[0][0], 'error');

      console.log.callCount.should.equal(0);
    });

    it('should emit a success message when there is no error', function() {
      deployment.complete(null);

      console.error.callCount.should.equal(0);

      console.log.callCount.should.equal(1);
      should.equal(console.log.args[0][0], 'Deployment completed');
    });
  });
});
