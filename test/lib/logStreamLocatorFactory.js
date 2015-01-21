// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Library: CloudWatch log stream locator service', function() {
  var async;
  var aws;
  var cloudWatchLogs;
  var lodash;
  var logFilter;
  var logFilterFactory;
  var logStreamLocator;
  var logStreamLocatorFactory;

  beforeEach(function() {
    cloudWatchLogs = {
      describeLogStreams: sinon.stub(),
      getLogEvents: sinon.stub()
    };

    async = {
      eachSeries: sinon.stub(),
      series: sinon.stub(),
      until: sinon.stub()
    };

    aws = { CloudWatchLogs: sinon.stub() };
    aws.CloudWatchLogs.returns(cloudWatchLogs);

    lodash = {
      delay: sinon.spy(),
      each: sinon.stub(),
      partial: sinon.stub(),
      partialRight: sinon.stub()
    };

    logFilter = { isStartEvent: sinon.stub() };
    logFilterFactory = sinon.stub().returns(logFilter);

    logStreamLocatorFactory = proxyquire(
      '../../lib/logStreamLocatorFactory',
      {
        async: async,
        'aws-sdk': aws,
        lodash: lodash,
        './logFilterFactory': logFilterFactory
      }
    );
    logStreamLocator = logStreamLocatorFactory('log-group', 42, 'request-id');
  });

  it('should create a logFilterFactory', function() {

  });

  describe('_requestStreamHasBeenFound', function() {
    it('should return true when a log stream has been found', function() {
      logStreamLocator._logStreamForRequestId = 'stream';
      should(logStreamLocator._requestStreamHasBeenFound()).be.true;
    });

    it('should return false when no log stream has been found', function() {
      logStreamLocator._logStreamForRequestId = null;
      should(logStreamLocator._requestStreamHasBeenFound()).be.false;
    });
  });

  describe('_logStreamFound', function() {
    it('should pass the log stream value to the callback', function() {
      var callback = sinon.spy();

      logStreamLocator._logStreamForRequestId = 'stream';
      logStreamLocator._logStreamFound(callback);

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal(null);
      should(callback.args[0][1]).equal('stream');
    });
  });

  describe('_testForStartEvent', function() {
    it('should assign the log stream if a start event is found', function() {
      var stream = { logStreamName: 'log-stream-name' };
      var event = { };

      logFilter.isStartEvent.returns(true);

      logStreamLocator._testForStartEvent(stream, event);
      should(logStreamLocator._logStreamForRequestId).equal('log-stream-name');
    });

    it(
      'should not assign the log stream if no start event was found',
      function() {
        var stream = { logStreamName: 'log-stream-name' };
        var event = { };

        logFilter.isStartEvent.returns(false);

        logStreamLocator._testForStartEvent(stream, event);
        should(logStreamLocator._logStreamForRequestId).be.empty;
      }
    );
  });

  describe('_searchStreamForStartEvent', function() {
    var callback;

    beforeEach(function() {
      callback = sinon.spy();
    });

    it('should pass through errors to the callback', function() {
      logStreamLocator._searchStreamForStartEvent(
        'error',
        null,
        null,
        callback
      );

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal('error');
    });

    it('should iterate over log events when available', function() {
      lodash.partial.returns('test-for-start-event');

      logStreamLocator._searchStreamForStartEvent(
        null,
        { events: 'events' },
        'stream',
        callback
      );

      lodash.partial.callCount.should.equal(1);
      should(lodash.partial.args[0][0]).equal(
        logStreamLocator._testForStartEvent
      );
      should(lodash.partial.args[0][1]).equal('stream');

      lodash.each.callCount.should.equal(1);
      should(lodash.each.args[0][0]).equal('events');
      should(lodash.each.args[0][1]).equal('test-for-start-event');

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal(null);
    });
  });

  describe('_searchStreamForRequest', function() {
    it('should request the log events from CloudWatch', function() {
      var callback = sinon.spy();
      var stream = { logStreamName: 'stream-name' };

      logStreamLocator._searchStreamForRequest(stream, callback);

      cloudWatchLogs.getLogEvents.callCount.should.equal(1);
      should(cloudWatchLogs.getLogEvents.args[0][0]).eql(
        {
          logGroupName: 'log-group',
          logStreamName: 'stream-name',
          startFromHead: true,
          startTime: 42
        }
      );

      lodash.partialRight.callCount.should.equal(1);
      should(lodash.partialRight.args[0][0]).equal(
        logStreamLocator._searchStreamForStartEvent
      );
      should(lodash.partialRight.args[0][1]).equal(stream);
      should(lodash.partialRight.args[0][2]).equal(callback);
    });
  });

  describe('_searchStreamsForRequestId', function() {
    it('should examine each stream in series', function() {
      var callback = sinon.spy();

      logStreamLocator._searchStreamsForRequestId(callback);

      async.eachSeries.callCount.should.equal(1);
      should(async.eachSeries.args[0][0]).eql([ ]);
      should(async.eachSeries.args[0][1]).equal(
        logStreamLocator._searchStreamForRequest
      );
      should(async.eachSeries.args[0][2]).equal(callback);
    });
  });

  describe('_logStreamsReceived', function() {
    var callback;

    beforeEach(function() {
      callback = sinon.spy();
    });

    it('should pass errors along to the callback', function() {
      logStreamLocator._logStreamsReceived('error', null, callback);

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal('error');
    });

    it('should set the list of available log streams on success', function() {
      logStreamLocator._logStreamsReceived(
        null,
        { logStreams: 'streams' },
        callback
      );

      should(logStreamLocator._streamList).equal('streams');

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal(null);
    });
  });

  describe('_getLogStreams', function() {
    it('should request the available log streams from CloudWatch', function() {
      var callback = sinon.spy();

      lodash.partialRight.returns('log-streams-received');

      logStreamLocator._getLogStreams(callback);

      lodash.partialRight.callCount.should.equal(1);
      should(lodash.partialRight.args[0][0]).equal(
        logStreamLocator._logStreamsReceived
      );
      should(lodash.partialRight.args[0][1]).equal(callback);

      cloudWatchLogs.describeLogStreams.callCount.should.equal(1);
      should(cloudWatchLogs.describeLogStreams.args[0][0]).eql(
        { logGroupName: 'log-group' }
      );
      should(cloudWatchLogs.describeLogStreams.args[0][1]).equal(
        'log-streams-received'
      );
    });
  });

  describe('_checkForStartEvent', function() {
    it('should update the log streams, then search through them', function() {
      var callback = sinon.spy();

      logStreamLocator._checkForStartEvent(callback);

      async.series.callCount.should.equal(1);
      should(async.series.args[0][0]).eql(
        [
          logStreamLocator._getLogStreams,
          logStreamLocator._searchStreamsForRequestId
        ]
      );
      should(async.series.args[0][1]).equal(callback);
    });
  });

  describe('getLogStreamForRequestId', function() {
    it(
      'should use async.until to wait for the log stream to be found',
      function() {
        var callback = sinon.spy();

        lodash.partial.onFirstCall().returns('delay');
        lodash.partial.onSecondCall().returns('log-stream-found');

        logStreamLocator.getLogStreamForRequestId(callback);

        should(lodash.partial.args[0][0]).equal(lodash.delay);
        should(lodash.partial.args[0][1]).equal(
          logStreamLocator._checkForStartEvent
        );
        should(lodash.partial.args[0][2]).equal(1000);

        should(lodash.partial.args[1][0]).equal(
          logStreamLocator._logStreamFound
        );
        should(lodash.partial.args[1][1]).equal(callback);

        async.until.callCount.should.equal(1);
        should(async.until.args[0][0]).equal(
          logStreamLocator._requestStreamHasBeenFound
        );
        should(async.until.args[0][1]).equal('delay');
        should(async.until.args[0][2]).equal('log-stream-found');
      }
    );
  });
});
