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
  this.setMinSize = awsParams.setMinSize;
  delete this.params.setMinSize;
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
 * If params.setMinSize == true, the auto scale group will first be updated to have it's minimum size match
 * desired capacity before the scale attempt is made.
 *
 * @param callback
 */
AutoScaleGroup.prototype.scale = function (callback) {
  var self = this;
  var autoScaling = new AWS.AutoScaling();

  if (this.setMinSize) {
    updateMinSizeBeforeChaningDesiredCapacity();
  } else {
    setDesiredCapacity();
  }

  function updateMinSizeBeforeChaningDesiredCapacity() {
    var updateParams = {
      AutoScalingGroupName: self.params.AutoScalingGroupName,
      MinSize: self.params.DesiredCapacity
    };
    autoScaling.updateAutoScalingGroup(updateParams, function (err) {
      if (err) {
        callback({
          type: 'AutoScaleGroup',
          name: self.params.AutoScalingGroupName,
          status: 'failure',
          error: err
        });
      } else {
        setDesiredCapacity();
      }
    });
  }

  function setDesiredCapacity() {
    autoScaling.setDesiredCapacity(self.params, function(err) {
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
  }
};

module.exports = AutoScaleGroup;