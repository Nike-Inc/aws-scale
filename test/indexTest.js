'use strict';
var sinon = require('sinon');
var awsScale = require('../index');
var assert = require('chai').assert;

var ResourceSet = require('../src/ResourceSet');
var DynamoDB = require('../src/resources/DynamoDB');
var AutoScaleGroup = require('../src/resources/AutoScaleGroup');

describe('index.js', function () {

  it('should include ResourceSet', function () {
    assert.isTrue(awsScale.ResourceSet === ResourceSet);
  });

  it('should include DynamoDB', function () {
    assert.isTrue(awsScale.DynamoDB === DynamoDB);
  });

  it('should include AutoScaleGroup', function () {
    assert.isTrue(awsScale.AutoScaleGroup === AutoScaleGroup);
  });

});