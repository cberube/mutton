'use strict';

var _ = require('lodash');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var should = require('should');

var fs = { readFileSync: sinon.stub() };
var mustache = { render: sinon.stub() };
var readFileResult = { toString: sinon.stub() };

var eventLoader = proxyquire(
  '../../lib/eventLoader',
  { fs: fs, mustache: mustache }
);

describe('Library: Event template loader', function() {
  it('should load a template and apply mustache to it', function() {
    var result;

    fs.readFileSync.returns(readFileResult);
    readFileResult.toString.returns('template-string');

    mustache.render.returns('{ "foo": "bar" }');

    result = eventLoader.loadEventTemplate('template-path', 'variables');

    fs.readFileSync.callCount.should.equal(1);
    should(fs.readFileSync.args[0][0]).equal('template-path');

    readFileResult.toString.callCount.should.equal(1);

    mustache.render.callCount.should.equal(1);
    should(mustache.render.args[0][0]).equal('template-string');

    result.should.eql({ foo: 'bar' });
  });
});
