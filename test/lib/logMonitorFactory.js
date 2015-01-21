// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Library: CloudWatch log monitor service', function() {
  var async;
  var endOfInvocationMonitor;
  var endOfInvocationMonitorFactory;
  var invocationTask;
  var logMonitor;
  var logMonitorFactory;
  var logStreamLocator;
  var logStreamLocatorFactory;

  beforeEach(function() {
    async = { waterfall: sinon.stub() };

    endOfInvocationMonitor = { waitForEndEvent: sinon.spy() };
    endOfInvocationMonitorFactory = sinon.stub().returns(
      endOfInvocationMonitor
    );

    invocationTask = {
      functionName: 'function-name',
      requestId: 'request-id',
      startTime: 42
    };

    logStreamLocator = { getLogStreamForRequestId: sinon.spy() };
    logStreamLocatorFactory = sinon.stub().returns(logStreamLocator);

    logMonitorFactory = proxyquire(
      '../../lib/logMonitorFactory',
      {
        async: async,
        './endOfInvocationMonitorFactory': endOfInvocationMonitorFactory,
        './logStreamLocatorFactory': logStreamLocatorFactory
      }
    );
    logMonitor = logMonitorFactory(invocationTask);
  });

  it('should create an endOfInvocation monitor', function() {
    endOfInvocationMonitorFactory.callCount.should.equal(1);
    should(endOfInvocationMonitorFactory.args[0][0]).equal(invocationTask);
  });

  it('should create a logStreamLocator', function() {
    logStreamLocatorFactory.callCount.should.equal(1);
    should(logStreamLocatorFactory.args[0][0]).equal(
      '/aws/lambda/function-name'
    );
    should(logStreamLocatorFactory.args[0][1]).equal(42);
    should(logStreamLocatorFactory.args[0][2]).equal('request-id');
  });

  describe('_logStreamFound', function() {
    var callback;

    beforeEach(function() {
      callback = sinon.spy();
    });

    it('should update the log stream in the invocation task', function() {
      logMonitor._logStreamFound('log-stream', callback);

      should(invocationTask.logStream).equal('log-stream');
    });

    it('should signal the callback function', function() {
      logMonitor._logStreamFound('log-stream', callback);

      callback.callCount.should.equal(1);
    });
  });

  describe('waitForStartEvent', function() {
    var callback;

    beforeEach(function() {
      callback = sinon.spy();

      sinon.stub(console, 'log');
    });

    afterEach(function() {
      console.log.restore();
    });

    it('should emit a console message', function() {
      logMonitor.waitForStartEvent(callback);

      console.log.callCount.should.equal(1);
      should(console.log.args[0][0]).equal('Searching for log stream...');
    });

    it('should use async.waterfall to find the log stream', function() {
      logMonitor.waitForStartEvent(callback);

      async.waterfall.callCount.should.equal(1);
      should(async.waterfall.args[0][0]).eql(
        [
          logStreamLocator.getLogStreamForRequestId,
          logMonitor._logStreamFound
        ]
      );
      should(async.waterfall.args[0][1]).equal(callback);
    });
  });

  describe('waitForEndEvent', function() {
    var callback;

    beforeEach(function() {
      callback = sinon.spy();

      sinon.stub(console, 'log');
    });

    afterEach(function() {
      console.log.restore();
    });

    it('should emit a console message', function() {
      logMonitor.waitForEndEvent(callback);

      console.log.callCount.should.equal(1);
      should(console.log.args[0][0]).equal('Waiting for END log...');
    });

    it('should defer to the endOfInvocationMonitor', function() {
      logMonitor.waitForEndEvent(callback);

      endOfInvocationMonitor.waitForEndEvent.callCount.should.equal(1);
      should(endOfInvocationMonitor.waitForEndEvent.args[0][0]).equal(
        callback
      );
    });
  });
});
