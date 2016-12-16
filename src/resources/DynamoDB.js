'use strict';

var AWS = require('aws-sdk');

/**
 *
 * @param awsParams
 * @constructor
 */
var DynamoDB = function (awsParams) {
  if (typeof awsParams !== 'object') {
    throw new Error("Constructor requires parameter object.");
  }
  if (typeof awsParams.TableName !== 'string') {
    throw new Error("Missing params.TableName.");
  }

  this.params = awsParams;
};

DynamoDB.prototype.getParams = function () {
  return this.params;
};

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