// jshint -W030

'use strict';

var should = require('should');

describe('Library: CloudWatch log filter service', function() {
  var logFilterFactory;
  var logFilter;

  beforeEach(function() {
    logFilterFactory = require('../../lib/logFilterFactory');
    logFilter = logFilterFactory('request-id');
  });

  describe('isStartEvent', function() {
    it(
      'should return true when the event message matches the start marker',
      function() {
        var event = { message: 'START RequestId: request-id\n' };
        should(logFilter.isStartEvent(event)).be.true;
      }
    );

    it(
      'should return false when the message does not match the start marker',
      function() {
        var event = { message: 'Oranges are orange' };
        should(logFilter.isStartEvent(event)).be.false;
      }
    );
  });

  describe('isEndEvent', function() {
    it(
      'should return true when the event message matches the end marker',
      function() {
        var event = { message: 'END RequestId: request-id\n' };
        should(logFilter.isEndEvent(event)).be.true;
      }
    );

    it(
      'should return false when the message does not match the end marker',
      function() {
        var event = { message: 'Oranges are orange' };
        should(logFilter.isEndEvent(event)).be.false;
      }
    );
  });
});
