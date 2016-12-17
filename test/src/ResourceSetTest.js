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

    var callback;
    var resource1;
    var resource2;

    beforeEach(function () {
      callback = sinon.spy();

      resource1 = new DynamoDB({TableName: 'table1'});
      sinon.stub(resource1, 'scale');
      resource2 = new DynamoDB({TableName: 'table2'});
      sinon.stub(resource2, 'scale');
    });

    it ('should return empty array if set contains no resources', function () {
      resourceSet.scale(callback);

      assert.isTrue(callback.calledOnce, 'should invoke callback immediately if there are no resources to scale');
      assert.isTrue(callback.calledWith(null, []), 'should return empty results object');
    });

    it ('should not fail if no callback was provided and set contains no resources', function () {
      resourceSet.scale();
    });

    it ('should call scale on each resource', function () {
      resourceSet.add(resource1);
      resourceSet.add(resource2);

      resourceSet.scale(callback);

      assert.isTrue(resource1.scale.calledOnce, 'should scale resource1');
      assert.isTrue(resource1.scale.calledWith(sinon.match.func), 'should provide callback function');
      assert.isTrue(resource2.scale.calledOnce, 'should scale resource2');
      assert.isTrue(resource2.scale.calledWith(sinon.match.func), 'should provide callback function')
    });

    it('should return array of results with no error if all are successful', function () {
      resourceSet.add(resource1);
      resourceSet.add(resource2);

      resourceSet.scale(callback);

      assert.isFalse(callback.called, 'callback should not be invoked until all resources respond');

      // Resource 1 finishes
      var resource1Result = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'success'
      };
      resource1.scale.callArgWith(0, resource1Result);

      assert.isFalse(callback.called, 'callback should not be invoked until all resources respond');

      // Resource 2 finishes
      var resource2Result = {
        type: 'DynamoDB',
        name: 'table2',
        status: 'success'
      };
      resource2.scale.callArgWith(0, resource2Result);

      assert.isTrue(callback.calledOnce, 'should invoke callback after all resources return result');
      assert.isTrue(callback.calledWith(null, [resource1Result, resource2Result]), 'should return results in an array');
    });

    it('should return array of results as an error if any resources failed', function () {
      resourceSet.add(resource1);
      resourceSet.add(resource2);

      resourceSet.scale(callback);

      assert.isFalse(callback.called, 'callback should not be invoked until all resources respond');

      // Resource 1 finishes with failure
      var resource1Result = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'failure',
        error: 'somethingBadHappened'
      };
      resource1.scale.callArgWith(0, resource1Result);

      assert.isFalse(callback.called, 'callback should not be invoked until all resources respond');

      // Resource 2 finishes
      var resource2Result = {
        type: 'DynamoDB',
        name: 'table2',
        status: 'success'
      };
      resource2.scale.callArgWith(0, resource2Result);

      assert.isTrue(callback.calledOnce, 'should invoke callback after all resources return result');
      assert.isTrue(callback.calledWith([resource1Result, resource2Result]), 'should return results in an array as error');
    });

    it('should not fail if no callback was provided and all results are returned', function () {
      resourceSet.add(resource1);

      resourceSet.scale();

      // Resource 1 finishes
      var resource1Result = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'success'
      };
      resource1.scale.callArgWith(0, resource1Result);
    });

  });
});