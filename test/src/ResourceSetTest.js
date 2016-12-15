'use strict';

var sinon = require('sinon');
var assert = require('chai').assert;
var ResourceSet = require('../../src/ResourceSet');
var DynamoDB = require('../../src/resources/DynamoDB');

describe('ResourceSet', function () {

  var resourceSet;

  beforeEach(function () {
    resourceSet = new ResourceSet();
  });

  describe('module', function () {

    it('should be a function', function () {
      assert.isFunction(ResourceSet, 'module should be a function');
    });

  });

  describe('Add', function () {

    it('should reject undefined', function () {
      function test() {
        resourceSet.add();
      }

      assert.throws(test, 'ResourceSet.add must be passed a valid resource object.');
    });

    it('should reject a non-resource object', function () {
      function test() {
        resourceSet.add({});
      }

      assert.throws(test, 'ResourceSet.add must be passed a valid resource object.');
    });

    it('should accept a DynamoDB resource object', function () {
      resourceSet.add(new DynamoDB({TableName: 'testTableName'}));
    });

  });

  describe('getResources', function () {

    it('should return an empty array if no resources have been added', function () {
      var resources = resourceSet.getResources();

      assert.isArray(resources, 'should return an array.');
      assert.equal(resources.length, 0, 'should be empty.');
    });

    it('should contain added resources', function () {
      var resource = new DynamoDB({TableName: 'tableName'});

      resourceSet.add(resource);

      var resources = resourceSet.getResources();
      assert.equal(resources.length, 1, 'should have one resource.');
      assert.isTrue(resource === resources[0], 'should contain resource that was added.');
    });

  });

  describe('Scale', function () {

    beforeEach(function () {

    });

    describe('DynamoDB', function () {

      it('should call AWS SDK for DynamoDB', function () {

      });

      it('should call AWS SDK with proper params', function () {

      });

    });
  });
});