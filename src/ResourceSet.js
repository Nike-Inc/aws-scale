'use strict';

var DynamoDB = require('./resources/DynamoDB');

/**
 *
 * @constructor
 */
var ResourceSet = function () {
  this.resources = [];
};

ResourceSet.prototype.add = function (resource) {
  if (resource instanceof DynamoDB) {
    this.resources.push(resource);
  } else {
    throw new Error('ResourceSet.add must be passed a valid resource object.');
  }
};

ResourceSet.prototype.getResources = function () {
  return this.resources;
};

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