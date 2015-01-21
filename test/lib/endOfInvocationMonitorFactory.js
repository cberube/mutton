// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Library: CloudWatch end-of-invocation monitor service', function() {
  var async;
  var aws;
  var cloudWatchLogs;
  var endOfInvocationMonitorFactory;
  var endOfInvocationMonitor;
  var invocationTask;
  var lodash;
  var logFilter;
  var logFilterFactory;

  beforeEach(function() {
    cloudWatchLogs = { getLogEvents: sinon.stub() };

    async = { until: sinon.stub() };

    aws = { CloudWatchLogs: sinon.stub() };
    aws.CloudWatchLogs.returns(cloudWatchLogs);

    invocationTask = {
      functionName: 'function-name',
      logStream: 'log-stream',
      startTime: 42
    };

    lodash = {
      delay: sinon.spy(),
      each: sinon.stub(),
      partial: sinon.stub(),
      partialRight: sinon.stub()
    };

    logFilter = { isEndEvent: sinon.stub() };
    logFilterFactory = sinon.stub();
    logFilterFactory.returns(logFilter);

    endOfInvocationMonitorFactory = proxyquire(
      '../../lib/endOfInvocationMonitorFactory',
      {
        async: async,
        'aws-sdk': aws,
        lodash: lodash,
        './logFilterFactory': logFilterFactory
      }
    );

    endOfInvocationMonitor = endOfInvocationMonitorFactory(invocationTask);
  });

  describe('_hasEndBeenFound', function() {
    it('should return true when an END event has been found', function() {
      endOfInvocationMonitor.hasEndBeenFound = true;
      should(endOfInvocationMonitor._hasEndBeenFound()).be.true;
    });

    it('should return false when an END event has not been found', function() {
      endOfInvocationMonitor.hasEndBeenFound = false;
      should(endOfInvocationMonitor._hasEndBeenFound()).be.false;
    });
  });

  describe('_testForEndEvent', function() {
    afterEach(function() {
      logFilter.isEndEvent.callCount.should.equal(1);
      should(logFilter.isEndEvent.args[0][0]).equal('event');
    });

    it(
      'should set the hasEndBeenFound flag when an end event is found',
      function() {
        logFilter.isEndEvent.returns(true);
        endOfInvocationMonitor.hasEndBeenFound = false;
        endOfInvocationMonitor._testForEndEvent('event');
        should(endOfInvocationMonitor.hasEndBeenFound).be.true;
      }
    );

    it(
      'should not set the hasEndBeenFound flag if an end event is not found',
      function() {
        logFilter.isEndEvent.returns(false);
        endOfInvocationMonitor.hasEndBeenFound = false;
        endOfInvocationMonitor._testForEndEvent('event');
        should(endOfInvocationMonitor.hasEndBeenFound).be.false;
      }
    );
  });

  describe('_searchForEndEvent', function() {
    var callback;

    beforeEach(function() {
      callback = sinon.spy();
    });

    it('should propagate errors to the given callback', function() {
      endOfInvocationMonitor._searchForEndEvent('error', null, callback);

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal('error');

      lodash.each.callCount.should.equal(0);
    });

    it('should iterate over the events when available', function() {
      endOfInvocationMonitor._searchForEndEvent(
        null,
        { events: 'events' },
        callback
      );

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal(null);

      lodash.each.callCount.should.equal(1);
      should(lodash.each.args[0][0]).equal('events');
      should(lodash.each.args[0][1]).equal(
        endOfInvocationMonitor._testForEndEvent
      );
    });
  });

  describe('_queryForEndEvent', function() {
    it('should query for log events', function() {
      var callback = sinon.spy();

      lodash.partialRight.returns('search-for-end-event');

      endOfInvocationMonitor._queryForEndEvent(callback);

      cloudWatchLogs.getLogEvents.callCount.should.equal(1);

      should(cloudWatchLogs.getLogEvents.args[0][0]).eql(
        {
          logGroupName: '/aws/lambda/function-name',
          logStreamName: 'log-stream',
          startFromHead: true,
          startTime: 42
        }
      );
      should(cloudWatchLogs.getLogEvents.args[0][1]).equal(
        'search-for-end-event'
      );

      lodash.partialRight.callCount.should.equal(1);
      should(lodash.partialRight.args[0][0]).equal(
        endOfInvocationMonitor._searchForEndEvent
      );
      should(lodash.partialRight.args[0][1]).equal(callback);
    });
  });

  describe('waitForEndEvent', function() {
    it(
      'should use async.unit to wait for an END event in the logs',
      function() {
        var callback = sinon.spy();

        lodash.partial.returns('delay');

        endOfInvocationMonitor.waitForEndEvent(callback);

        async.until.callCount.should.equal(1);
        should(async.until.args[0][0]).equal(
          endOfInvocationMonitor._hasEndBeenFound
        );
        should(async.until.args[0][1]).equal('delay');
        should(async.until.args[0][2]).equal(callback);

        lodash.partial.callCount.should.equal(1);
        should(lodash.partial.args[0][0]).equal(lodash.delay);
        should(lodash.partial.args[0][1]).equal(
          endOfInvocationMonitor._queryForEndEvent
        );
        should(lodash.partial.args[0][2]).equal(1000);
      }
    );
  });
});
