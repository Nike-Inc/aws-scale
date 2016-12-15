'use strict';

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

module.exports = DynamoDB;