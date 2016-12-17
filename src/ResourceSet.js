'use strict';

var DynamoDB = require('./resources/DynamoDB');

/**
 * Manages and scales a set of AWS resources together. The ResourceSet scales all the resources and reports the final
 * status of each scale operation once all have completed.
 *
 * @constructor
 */
var ResourceSet = function () {
  this.resources = [];
};

/**
 * Adds a resource to the set.
 *
 * @param resource - a resource object from the aws-scale library, not a full AWS SDK object.
 */
ResourceSet.prototype.add = function (resource) {
  if (resource instanceof DynamoDB) {
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
        success ? callback(null, results) : callback(results);
      }
    });
  }
};

module.exports = ResourceSet;