var program = require('commander');

program
    .version('0.0.2')
    .command('deploy', 'Packages and deploys AWS Lambda functions')
    .parse(process.argv);
