# Aws-Scale [![Build Status](https://travis-ci.org/aaronbruckner/aws-scale.svg?branch=master)](https://travis-ci.org/aaronbruckner/aws-scale)
## A simple module for scaling AWS resources together.

### Problem
Developing applications on AWS can get expensive. Leaving EC2s, DynamoDB tables, and Kinesis streams running in test accounts
adds up. Complex cloud services rely on multiple resources that have to manually be scaled up. Once up, resources
can be easily forgotten about and left at development or performance testing levels.

### Solution

AWS-Scale is a simple library used to automate the scaling process. You can use it to build single lambda functions
that automatically scale down resources at the end of the day or create node scripts that scale up application stacks.

### Usage

Currently supported AWS resources:
* DynamoDB
* AutoScaling Groups

Below is an example Lambda function that scales down a test webservice:

```js
var scale = require('aws-scale');

exports.handler = function (event, context, callback) {

  // Data store for the webservice
  var dynamoParams = {
    TableName: 'userDataTable',
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    },
    GlobalSecondaryIndexUpdates: [
      {
        Update: {
          IndexName: 'lastLoginDate',
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        }
      }
    ]
  };
  
  // AutoScale group containing EC2 instances responding to http requests
  var asgParams = {
      AutoScalingGroupName: 'expressWebServiceASG',
      DesiredCapacity: 0
  };
  
  var resourceSet = new scale.ResourceSet();
  resourceSet.add(new scale.DynamoDB(dynamoParams));
  resourceSet.add(new scale.AutoScaleGroup(asgParams));
  
  // Callback will be invoked after AWS responds to every scale request.
  resourceSet.scale(function (err) {
    if (err) {
      // CloudWatch hides arrays, this will print the entire array out for debugging purposes.
      callback(JSON.stringify(err));
    } else {
      callback();
    }
  });
};
```
This allows you to schedule a single lambda function to scale down an entire application stack for the night.

A similar pattern can be followed for node scripts (or another scheduled Lambda)that scale the resources back up 
for development:

```js
var scale = require('aws-scale');

var dynamoParams = {
TableName: 'userDataTable',
ProvisionedThroughput: {
  ReadCapacityUnits: 500,
  WriteCapacityUnits: 500
},
GlobalSecondaryIndexUpdates: [
  {
    Update: {
      IndexName: 'lastLoginDate',
      ProvisionedThroughput: {
        ReadCapacityUnits: 100,
        WriteCapacityUnits: 100
      }
    }
  }
]
};

var asgParams = {
  AutoScalingGroupName: 'expressWebServiceASG',
  DesiredCapacity: 3
};

var resourceSet = new scale.ResourceSet();
resourceSet.add(new scale.DynamoDB(dynamoParams));
resourceSet.add(new scale.AutoScaleGroup(asgParams));

resourceSet.scale(function(err, data) {
  if (err) {
    console.log(err);
  } else {
    console.log(data);
  }
});
```

The script can be run via ```node webServiceScaleUp.js```. More features are coming that will allow you to monitor
the status of the scale up operations and notify you once all have finished.

**Callback Return**

The callback passed to resourceSet.scale is treated like an aws callback with an err and data parameter. If every resource
successfully starts it's scale operation, an array of status objects will be returned as data with a null err parameter.
If any of the scale attempts receive an error from AWS, the array of all resource statuses will be returned as an error.

Example successful return - callback (null, data): 

```js
data = [
  {
    type: 'DynamoDB',
    name: 'userDataTable',
    status: 'success'
  },
  {
    type: 'AutoScaleGroup',
    name: 'expressWebServiceASG',
    status: 'success'
  }
];
```
Example error return - callback (err, null): 

```js
// Will wait for a response from all resources before returning array with error.
err = [
  {
    type: 'DynamoDB',
    name: 'userDataTable',
    status: 'failure',
    error: { // Error object returned from AWS SDK call.
      "errorMessage": "2 validation errors detected: Value '0' at 'provisionedThroughput.writeCapacityUnits' failed to satisfy constraint: Member must have value greater than or equal to 1; Value '0' at 'provisionedThroughput.readCapacityUnits' failed to satisfy constraint: Member must have value greater than or equal to 1",
      "errorType": "ValidationException",
    }
  },
  {
    type: 'AutoScaleGroup',
    name: 'expressWebServiceASG',
    status: 'success'
  }
];

```

**Resource Parameter Objects**

The parameter objects passed to the resources are directly passed to an AWS Javascript SDK call. The contract for
each of these resource parameter objects can be found at:

* scale.DynamoDB - AWS SDK DynamoDB.updateTable: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateTable-property
* scale.AutoScaleGroup - AWS SDK AutoScaling.setDesiredCapacity: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/AutoScaling.html#setDesiredCapacity-property

### Feature Features

This module is under active development and I'd like to add any helpful features you can think of. Please visit the 
github page to make any feature requests! Below are some of my next targets:

* Add Kinesis stream scaling.
* Add a AutoScale group minimum instance update option. If set, this would allow the resource to also update the 
minimum number of instances allowed in the ASG before attempting to scale the ASG to that number. This could be useful
because most Cloud Formation templates may have a minimum above zero (which would make sense for production ASGs but
in test you may want to completely shut it down overnight).
* Add scale progress mode. This allows you to scale a set of resources while aws-scale polls each resource and notifies
you when all resources are finished scaling (and therefore ready for you to work on).

### Change Log

#### 1.0.0 - Dec 17, 2016
* Initial release!
* Added ResourceSet to link scaling operations between AWS resource together.
* Added scaling resource objects for DynamoDB and AutoScaling groups. 