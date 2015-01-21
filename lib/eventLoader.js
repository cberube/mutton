'use strict';

var fs = require('fs');
var mustache = require('mustache');

var eventLoader = { };

eventLoader.loadEventTemplate = function(templatePath, variables) {
  var template;
  var event;

  template = fs.readFileSync(templatePath).toString();
  event = JSON.parse(mustache.render(template, variables));

  return event;
};

module.exports = eventLoader;
