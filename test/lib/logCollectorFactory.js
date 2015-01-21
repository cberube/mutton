// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Library: CloudWatch log collector service', function() {
  var aws;
  var cloudWatchLogs;
  var invocationTask;
  var lodash;
  var logCollector;
  var logCollectorFactory;
  var logFilter;
  var logFilterFactory;

  beforeEach(function() {
    aws = { CloudWatchLogs: sinon.stub() };
    cloudWatchLogs = { getLogEvents: sinon.stub() };
    invocationTask = {
      eventList: [ ],
      functionName: 'function-name',
      logGroupName: 'log-group-name',
      logStream: 'log-stream',
      requestId: 'request-id',
      startTime: 42
    };
    lodash = { each: sinon.stub(), partialRight: sinon.stub() };
    logFilter = { isStartEvent: sinon.stub(), isEndEvent: sinon.stub() };

    aws.CloudWatchLogs.returns(cloudWatchLogs);

    logFilterFactory = sinon.stub();
    logFilterFactory.returns(logFilter);

    logCollectorFactory = proxyquire(
      '../../lib/logCollectorFactory',
      {
        'aws-sdk': aws,
        lodash: lodash,
        './logFilterFactory': logFilterFactory
      }
    );
    logCollector = logCollectorFactory(invocationTask);
  });

  it(
    'should create a logFilter instance with the given request ID',
    function() {
      logFilterFactory.callCount.should.equal(1);
      should(logFilterFactory.args[0][0]).equal('request-id');
    }
  );

  describe('_receivedEvents', function() {
    var callback;

    beforeEach(function() {
      callback = sinon.spy();
    });

    it('should propagate errors to the callback function', function() {
      logCollector._receivedEvents('error', null, callback);

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal('error');
    });

    it('should iterate through the log events on success', function() {
      logCollector._receivedEvents(null, { events: 'events' }, callback);

      lodash.each.callCount.should.equal(1);
      should(lodash.each.args[0][0]).equal('events');
      should(lodash.each.args[0][1]).equal(logCollector._processEvent);
    });
  });

  describe('_processEvent', function() {
    it(
      'should set the insideRequestLogs flag when the start event is found',
      function() {
        logFilter.isStartEvent.returns(true);

        logCollector.insideRequestLogs = false;
        logCollector._processEvent('event');

        logFilter.isStartEvent.callCount.should.equal(1);
        should(logFilter.isStartEvent.args[0][0]).equal('event');

        should(logCollector.insideRequestLogs).equal(true);
      }
    );

    it(
      'should clear the insideRequestLogs flag when the end event is found',
      function() {
        logFilter.isEndEvent.returns(true);

        logCollector.insideRequestLogs = true;
        logCollector._processEvent('event');

        logFilter.isEndEvent.callCount.should.equal(1);
        should(logFilter.isEndEvent.args[0][0]).equal('event');

        should(logCollector.insideRequestLogs).equal(false);
      }
    );

    it(
      'should add events to the event list when insideRequestLogs is true',
      function() {
        logCollector.insideRequestLogs = true;
        logCollector._processEvent('foo');
        logCollector._processEvent('bar');

        logCollector.insideRequestLogs = false;
        logCollector._processEvent('baz');

        logCollector.insideRequestLogs = true;
        logCollector._processEvent('qux');

        should(invocationTask.eventList).eql([ 'foo', 'bar', 'qux' ]);
      }
    )
  });

  describe('collectEvents', function() {
    var callback;

    beforeEach(function() {
      callback = sinon.spy();

      sinon.stub(console, 'log');
    });

    afterEach(function() {
      console.log.restore();
    });

    it('should emit a console message', function() {
      logCollector.collectEvents(callback);

      console.log.callCount.should.equal(1);
      should(console.log.args[0][0]).equal('Collecting log events...');
    });

    it(
      'should request the events for the log stream in the invocation task',
      function() {
        lodash.partialRight.returns('received-events');

        logCollector.collectEvents(callback);

        cloudWatchLogs.getLogEvents.callCount.should.equal(1);
        should(cloudWatchLogs.getLogEvents.args[0][0]).eql(
          {
            logGroupName: '/aws/lambda/function-name',
            logStreamName: 'log-stream',
            startFromHead: true,
            startTime: 42
          }
        );
        should(cloudWatchLogs.getLogEvents.args[0][1]).equal('received-events');

        lodash.partialRight.callCount.should.equal(1);
        should(lodash.partialRight.args[0][0]).equal(
          logCollector._receivedEvents
        );
        should(lodash.partialRight.args[0][1]).equal(callback);
      }
    );
  });
});
