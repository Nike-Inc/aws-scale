'use strict';

var DynamoDB = require('./resources/DynamoDB');
var AutoScaleGroup = require('./resources/AutoScaleGroup');
var clc = require('cli-color');

/**
 * Copyright 2016-present, Nike, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * -
 *
 * Manages and scales a set of AWS resources together. The ResourceSet scales all the resources and reports the final
 * status of each scale operation once all have completed.
 *
 * @param {object} [params] - optional. Used to enable additional features.
 * @constructor
 */
var ResourceSet = function (params) {
  this.resources = [];
  this.params = params || {};
};

/**
 * Adds a resource to the set.
 *
 * @param resource - a resource object from the aws-scale library, not a full AWS SDK object.
 */
ResourceSet.prototype.add = function (resource) {
  if (resource instanceof DynamoDB || resource instanceof AutoScaleGroup) {
    this.resources.push(resource);
  } else {
    throw new Error('ResourceSet.add must be passed a valid resource object.');
  }
};

/**
 * Returns all resource objects.
 *
 * @returns {Array} - returns an array holding all added objects.
 */
ResourceSet.prototype.getResources = function () {
  return this.resources;
};

/**
 * Polls the resources in the set.
 * @param callback
 */
// TODO: Add configurable timeout.
ResourceSet.prototype.pollScaleProgress = function (callback) {
  var self = this;
  var scaleResults = [];
  var success = true;
  var iteration = 1;
  console.log(clc.black.bgWhite.bold('---  Resource Polling Start  ---'));
  console.log('Resource Count: ' + self.resources.length);

  function poll() {
    console.log(clc.bold('\n-Iteration ' + (iteration++) + ' (' + new Date().toISOString() + ')\n'));
    var responseCount = 0;
    var noResourcesPending = true;
    for (var i = 0; i < self.resources.length; i++) {
      const index = i;
      var resource = self.resources[i];
      var scaleResult = scaleResults[i];
      if (scaleResult && scaleResult.status !== 'pending') {
        responseCount++;
        continue;
      }

      resource.getScalingProgress(function (result) {
        responseCount++;
        success = (success && result.status !== 'failure');
        noResourcesPending = noResourcesPending && (result.status !== 'pending');

        var resourceId = ' - ' + result.type + ' ' + result.name;
        switch (result.status) {
          case 'pending':
            console.log(clc.yellow.bold('PENDING') + resourceId + ' - ' + result.message);
            break;
          case 'success':
            console.log(clc.green.bold('SUCCESS') + resourceId);
            break;
          case 'failure':
            console.log(clc.red.bold('FAILURE') + resourceId + ' - ' + JSON.stringify(result.error));
            break;
        }

        scaleResults[index] = result;
        if (responseCount >= self.resources.length) {
          // All responses returned
          if (noResourcesPending) {
            console.log(clc.black.bgWhite.bold('---  Resource Polling Complete  ---'));
            console.log('\nFinal Results:');
            console.log(JSON.stringify(scaleResults, null, 2));
            success ? callback(null, scaleResults) : callback(scaleResults);
          } else {
            setTimeout(poll, 5000);
          }
        }
      });
    }
  }

  poll();
};

/**
 * Scales all resources managed by the set. After all resources are complete, the callback function is invoked. An
 * array of status objects are returned in the callback, one for each scaled resource. If all resources are successfully
 * scaled the array is returned as data, if one or more failed it will be returned as an error.
 *
 * @param callback(err, data) - invoked when all resources are finished scaling.
 */
ResourceSet.prototype.scale = function (callback) {
  var self = this;
  callback = callback || function () {};
  if (self.resources.length === 0) {
    callback(null, []);
  }

  var results = [];
  var success = true;
  for (var i = 0; i < self.resources.length; i++) {
    self.resources[i].scale(function (result) {
      results.push(result);
      success = success && (result.status === 'success');

      // All results finished, invoke callback
      if (results.length >= self.resources.length) {
        if (self.params.pollScaleProgress && success) {
          // Monitor scaling progress if requested
          self.pollScaleProgress(callback);
        } else if (success) {
          callback(null, results);
        } else {
          if (self.params.pollScaleProgress) {
            console.log(clc.red.bold('FAILURE') + ' - Polling skipped due to scale error.');
            console.log('\nFinal Results:');
            console.log(JSON.stringify(results, null, 2));
          }
          callback(results);
        }
      }
    });
  }
};

module.exports = ResourceSet;