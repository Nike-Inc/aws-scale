'use strict';

var AWS = require('aws-sdk');

/**
 * Scales an AWS auto scaling group.
 *
 * @param awsParams - parameter object for AWS SDK AutoScaling.setDesiredCapacity function.
 * @constructor
 */
var AutoScaleGroup = function (awsParams) {
  if (typeof awsParams !== 'object') {
    throw new Error('Constructor requires a AWS JavaScript SDK AutoScaling.setDesiredCapacity param object.');
  }
  if (typeof awsParams.AutoScalingGroupName !== 'string') {
    throw new Error('Missing params.AutoScalingGroupName.');
  }
  if (typeof awsParams.DesiredCapacity !== 'number') {
    throw new Error('Missing params.DesiredCapacity.');
  }

  this.params = awsParams;
};

/**
 * Scales the underlying auto scaling group. When complete, invokes the callback with a result object.
 * Object has the following structure:
 *
 * {
 *     type: 'AutoScaleGroup',
 *     name: <ASG-Name>,
 *     status: <success || failure>
 *
 *     // If status == failure:
 *     error: <error object from AWS SDK>
 * }
 *
 * @param callback
 */
AutoScaleGroup.prototype.scale = function (callback) {
  var self = this;
  var autoScaling = new AWS.AutoScaling();
  autoScaling.setDesiredCapacity(this.params, function(err) {
    var result = {
      type: 'AutoScaleGroup',
      name: self.params.AutoScalingGroupName,
      status: 'success'
    };

    if (err) {
      result.status = 'failure';
      result.error = err;
    }
    callback(result);
  });
};

module.exports = AutoScaleGroup;