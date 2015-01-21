'use strict';

var _ = require('lodash');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

describe('Library: Lambda invocation helper', function() {
  var aws;
  var invocationHelperFactory;
  var invocationHelper;
  var lambda;
  var lambdaRequest;
  var lodash;
  var logCollectorFactory;
  var logMonitorFactory;

  beforeEach(function() {
    aws = { Lambda: sinon.stub() };
    lambda = { invokeAsync: sinon.stub() };
    lambdaRequest = { on: sinon.stub(), send: sinon.spy() };
    lodash = { partialRight: sinon.stub() };
    logCollectorFactory = sinon.stub();
    logMonitorFactory = sinon.stub();

    aws.Lambda.returns(lambda);
    lambda.invokeAsync.returns(lambdaRequest);

    var invocationHelperFactory = proxyquire(
      '../../lib/invocationHelperFactory',
      {
        'aws-sdk': aws,
        'lodash': lodash,
        './logMonitorFactory': logMonitorFactory,
        './logCollectorFactory': logCollectorFactory
      }
    );

    invocationHelper = invocationHelperFactory();

    sinon.stub(console, 'log');
  });

  afterEach(function() {
    console.log.restore();
  });

  describe('invokeLambdaFunction', function() {
    it(
      'should invoke a lambda function and return an invocation task',
      function() {
        var callback = sinon.spy();
        var event = { foo: 'bar' };

        lodash.partialRight.returns('on-invoke-complete');

        invocationHelper.invokeLambdaFunction(
          'function-name',
          event,
          callback
        );

        console.log.callCount.should.equal(1);
        should(console.log.args[0][0]).equal('Invoking: function-name');

        lambda.invokeAsync.callCount.should.equal(1);
        should(lambda.invokeAsync.args[0][0]).eql({
          FunctionName: 'function-name',
          InvokeArgs: JSON.stringify(event)
        });

        lodash.partialRight.callCount.should.equal(1);
        should(lodash.partialRight.args[0][0]).eql(
          invocationHelper._onInvokeComplete,
          {
            functionName: 'function-name',
            event: event,
            eventList: [ ],
            logMonitor: undefined,
            logCollector: undefined,
            requestId: undefined,
            startTime: 0
          },
          callback
        );

        lambdaRequest.on.callCount.should.equal(1);
        should(lambdaRequest.on.args[0][0]).equal('complete');
        should(lambdaRequest.on.args[0][1]).equal('on-invoke-complete');

        lambdaRequest.send.callCount.should.equal(1);
      }
    );
  });

  describe('_onInvokeComplete', function() {
    it('should fill in the details of the invocation task', function() {
      var callback = sinon.spy();
      var invocationTask = { };
      var response = {
        httpResponse: { headers: { 'x-amzn-requestid': 'request-id' } }
      };

      logMonitorFactory.returns('log-monitor');
      logCollectorFactory.returns('log-collector');

      invocationHelper._onInvokeComplete(
        response,
        invocationTask,
        callback
      );

      should(invocationTask.logMonitor).equal('log-monitor');
      should(invocationTask.logCollector).equal('log-collector');
      should(invocationTask.requestId).equal('request-id');
    });
  });
});
