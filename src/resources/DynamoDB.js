'use strict';

var AWS = require('aws-sdk');

/**
 * Updates a DynamoDB table read/write throughput.
 *
 * @param awsParams - parameter object for AWS SDK DynamoDB.updateTable function.
 * @constructor
 */
var DynamoDB = function (awsParams) {
  if (typeof awsParams !== 'object') {
    throw new Error('Constructor requires a AWS JavaScript SDK DynamoDB.updateTable param object.');
  }
  if (typeof awsParams.TableName !== 'string') {
    throw new Error('Missing params.TableName.');
  }

  this.params = awsParams;
};

/**
 * Returns the parameter object passed to the constructor.
 * @returns {*} - the parameter object passed to the constructor.
 */
DynamoDB.prototype.getParams = function () {
  return this.params;
};

/**
 * Scales the underlying dynamoDB table. When complete, invokes the callback with a result object.
 * Object has the following structure:
 *
 * {
 *     type: 'DynamoDB',
 *     name: <DynamoTableName>,
 *     status: <success || failure>
 *
 *     // If status == failure:
 *     error: <error object from AWS SDK>
 * }
 *
 * @param callback
 */
DynamoDB.prototype.scale = function (callback) {
  var self = this;
  var dynamoDB = new AWS.DynamoDB();

  dynamoDB.updateTable(this.params, function (err) {
    var result = {
      type: 'DynamoDB',
      name: self.params.TableName,
      status: 'success'
    };

    if (err) {
      result.status = 'failure';
      result.error = err;
    }

    callback(result);
  });
};

module.exports = DynamoDB;