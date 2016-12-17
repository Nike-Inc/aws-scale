'use strict';

var AWS = require('aws-sdk');

/**
 *
 * @param awsParams
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