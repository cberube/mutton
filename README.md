# Mutton

AWS Lambda function deployment tool

## Purpose

Mutton is a tool designed to simplify the deployment of sets of Lambda functions into Amazon Web Services. It automates
the process of creating ZIP files containing the Lambda functions and their supporting libraries, and uses the AWS
SDK to upload those ZIP files to Lambda.

## Usage

`node mutton.js deploy <pattern>`

Where `pattern` is a glob expression indicating which directories inside the configured source directory should be
packaged and deployed as Lambda functions.

## Requirements

The machine used to execute Mutton must have access to AWS resources (via an IAM role or key / secret combination) and
must have permission to create Lambda functions.

## Configuration file options

`mutton.sourcePath`: The base directory to search for Lambda function packages
`mutton.deployPath`: The directory in which Lambda function ZIP files should be stored
    (write access to this directory is required by the user running Mutton)
`mutton.aws.region`: The AWS region into which Lambda functions should be deployed

## Sample lambda.json file

```json
{
    "FunctionName": "foo-function",
    "Handler": "exports.handler",
    "Timeout": 3,
    "MemorySize": 128,
    "Description": "Mutton is go!",
    "Role": "arn:aws:iam::123456789012:role/somethingSomethingIAM"
}
```
