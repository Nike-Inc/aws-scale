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

/**
 *
 * @private
 */
function _scale() {

}

module.exports = ResourceSet;