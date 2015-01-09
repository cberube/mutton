// jshint -W030

'use strict';

var proxyquire = require('proxyquire');
var sinon = require('sinon');
require('should');

describe('Mutton entry point', function() {
  var commanderStub;

  beforeEach(function() {
    commanderStub = {
      version: sinon.stub(),
      command: sinon.stub(),
      parse: sinon.stub()
    };

    commanderStub.version.returns(commanderStub);
    commanderStub.command.returns(commanderStub);
    commanderStub.parse.returns(commanderStub);

    proxyquire(
      '../mutton.js',
      { commander: commanderStub }
    );
  });

  it('should configure the application version', function() {
    commanderStub.version.callCount.should.equal(1);
    commanderStub.version.args[0][0].should.equal('0.0.2');
  });

  it('should configure the deploy sub-command', function() {
    commanderStub.command.callCount.should.equal(1);
    commanderStub.command.args[0][0].should.equal('deploy [filter]');
  });

  it('should parse the incoming arguments', function() {
    commanderStub.parse.callCount.should.equal(1);
    commanderStub.parse.args[0][0].should.equal(process.argv);
  });
});
