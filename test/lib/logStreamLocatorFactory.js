// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Library: CloudWatch log stream locator service', function() {
  var lodash;
  var logStreamLocator;
  var logStreamLocatorFactory;

  beforeEach(function() {
    lodash = { each: sinon.stub(), partial: sinon.stub() };

    logStreamLocatorFactory = proxyquire(
      '../../lib/logStreamLocatorFactory',
      { lodash: lodash }
    );
    logStreamLocator = logStreamLocatorFactory('log-group', 42, 'request-id');
  });

  it('should create a logFilterFactory', function() {

  });

  describe('_requestStreamHasBeenFound', function() {
    it('should return true when a log stream has been found', function() {
      logStreamLocator.logStreamForRequestId = 'stream';
      should(logStreamLocator._requestStreamHasBeenFound()).be.true;
    });

    it('should return false when no log stream has been found', function() {
      logStreamLocator.logStreamForRequestId = null;
      should(logStreamLocator._requestStreamHasBeenFound()).be.false;
    });
  });

  describe('_logStreamFound', function() {
    it('should pass the log stream value to the callback', function() {
      var callback = sinon.spy();

      logStreamLocator.logStreamForRequestId = 'stream';
      logStreamLocator._logStreamFound(callback);

      callback.callCount.should.equal(1);
      should(callback.args[0][0]).equal(null);
      should(callback.args[0][1]).equal('stream');
    });
  });

  describe('_testForStartEvent', function() {

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
});
