#!/usr/bin/env node

var program = require('commander');

program
  .version('0.0.2')
  .command('config', 'Creates default configuration files')
  .command(
    'deploy [basePath] [filter]',
    'Packages and deploys AWS Lambda functions'
  )
  .command('test [functionName] [eventSource]', 'Tests Lambda functions')
  .parse(process.argv);
