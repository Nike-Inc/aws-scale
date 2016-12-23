'use strict';

var sinon = require('sinon');
var assert = require('chai').assert;
var ResourceSet = require('../../src/ResourceSet');
var DynamoDB = require('../../src/resources/DynamoDB');
var AutoScaleGroup = require('../../src/resources/AutoScaleGroup');

describe('ResourceSet', function () {

  var resourceSet;
  var callback;
  var resource1;
  var resource2;

  beforeEach(function () {
    resourceSet = new ResourceSet();
    callback = sinon.spy();

    resource1 = new DynamoDB({TableName: 'table1'});
    sinon.stub(resource1, 'scale');
    sinon.stub(resource1, 'getScalingProgress');
    resource2 = new DynamoDB({TableName: 'table2'});
    sinon.stub(resource2, 'scale');
    sinon.stub(resource2, 'getScalingProgress');
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

    it('should accept an AutoScaleGroup resource object', function () {
      resourceSet.add(new AutoScaleGroup({AutoScalingGroupName: 'testASG', DesiredCapacity: 1}));
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
      sinon.stub(resourceSet, 'pollScaleProgress');
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
      assert.isFalse(resourceSet.pollScaleProgress.called, 'should not monitor scaling progress if not configured to do so.');
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

    it('should poll scaling progress instead of invoking callback if configured to do so', function () {
      resourceSet = new ResourceSet({pollScaleProgress: true});
      sinon.stub(resourceSet, 'pollScaleProgress');
      resourceSet.add(resource1);

      resourceSet.scale(callback);

      // Resource 1 finishes
      var resource1Result = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'success'
      };
      resource1.scale.callArgWith(0, resource1Result);

      assert.isFalse(callback.called, 'should not invoke callback if scale progress polling requested');
      assert.isTrue(resourceSet.pollScaleProgress.calledOnce, 'should start scale progress polling on resources');
      assert.isTrue(resourceSet.pollScaleProgress.calledWith(callback), 'should pass callback to poller');
    });

    it('should ignore polling if error occurs during scale process', function () {
      resourceSet = new ResourceSet({pollScaleProgress: true});
      sinon.stub(resourceSet, 'pollScaleProgress');
      resourceSet.add(resource1);

      resourceSet.scale(callback);

      // Resource 1 finishes with failure
      var resource1Result = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'failure',
        error: 'somethingBadHappened'
      };
      resource1.scale.callArgWith(0, resource1Result);

      assert.isTrue(callback.calledOnce, 'should invoke callback after all resources return result');
      assert.isTrue(callback.calledWith([resource1Result]), 'should return results in an array as error');
      assert.isFalse(resourceSet.pollScaleProgress.called, 'should not poll progress if any scaling operations failed');
    });

  });

  describe('pollScaleProgress', function () {

    var clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
      resourceSet.add(resource1);
      resourceSet.add(resource2);
    });

    afterEach(function () {
      clock.restore();
    });

    it('should check each resource scale progress', function () {
      resourceSet.pollScaleProgress(callback);

      assert.isTrue(resource1.getScalingProgress.called, 'should get resource 1 scale status');
      assert.isTrue(resource1.getScalingProgress.calledWith(sinon.match.func), 'should pass a function');
      assert.isTrue(resource2.getScalingProgress.called, 'should get resource 2 scale status');
      assert.isTrue(resource2.getScalingProgress.calledWith(sinon.match.func), 'should pass a function');
      assert.isFalse(callback.called, 'should not invoke callback until all resource polling is complete');
    });

    it('should invoke callback once all resources have responded with success', function () {
      resourceSet.pollScaleProgress(callback);

      // Simulate finished scaling attempt.
      var resource1Result = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'success'
      };
      resource1.getScalingProgress.callArgWith(0, resource1Result);

      assert.isFalse(callback.called, 'should not invoke callback until all resources respond');

      var resource2Result = {
        type: 'DynamoDB',
        name: 'table2',
        status: 'success'
      };
      resource2.getScalingProgress.callArgWith(0, resource2Result);

      assert.isTrue(callback.calledOnce, 'should invoke callback after all resources reported success');
      assert.isTrue(callback.calledWith(null, [resource1Result, resource2Result]), 'should return scale polling results as array');
    });

    it('should invoke callback and return error if one of the resources failed after all have responded', function () {
      resourceSet.pollScaleProgress(callback);

      // Simulate finished scaling attempt.
      var resource1Result = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'failure',
        error: {err: 'AWS error'}
      };
      resource1.getScalingProgress.callArgWith(0, resource1Result);

      assert.isFalse(callback.called, 'should not invoke callback until all resources respond');

      var resource2Result = {
        type: 'DynamoDB',
        name: 'table2',
        status: 'success'
      };
      resource2.getScalingProgress.callArgWith(0, resource2Result);

      assert.isTrue(callback.calledOnce, 'should invoke callback after all resources reported success/failure');
      assert.isTrue(callback.calledWith([resource1Result, resource2Result]), 'should return scale polling results as an error');
    });

    it('should poll a resource that returns a pending status every 5 seconds until it changes', function () {
      resourceSet = new ResourceSet();
      resourceSet.add(resource1);

      resourceSet.pollScaleProgress(callback);

      // Simulate multiple pending status returns
      var resource1PendingResult = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'pending',
        message: 'message 1'
      };
      resource1.getScalingProgress.callArgWith(0, resource1PendingResult);

      assert.isFalse(callback.called, 'should not invoke callback if resource returns pending status');

      clock.tick(4950); // just under 5 seconds
      assert.isTrue(resource1.getScalingProgress.calledOnce, 'should wait 5 seconds before calling resource again');
      clock.tick(500); // just over 5 seconds

      assert.isTrue(resource1.getScalingProgress.calledTwice, 'should continue polling after 5 seconds');
      var resource1SuccessResult = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'success'
      };
      resource1.getScalingProgress.callArgWith(0, resource1SuccessResult);
      assert.isTrue(callback.calledOnce, 'should invoke callback after pending resource completes');
      assert.isTrue(callback.calledWith(null, [resource1SuccessResult]), 'should return success result');
    });

    it('should not check resources that are already done while polling a pending resource', function () {
      resourceSet.pollScaleProgress(callback);

      // Simulate multiple pending status returns
      var resource1PendingResult = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'pending',
        message: 'message 1'
      };
      resource1.getScalingProgress.callArgWith(0, resource1PendingResult);

      var resource2SuccessResult = {
        type: 'DynamoDB',
        name: 'table2',
        status: 'success'
      };
      resource2.getScalingProgress.callArgWith(0, resource2SuccessResult);

      assert.isFalse(callback.called, 'should not invoke callback if resource returns pending status');

      clock.tick(5100); // just over 5 seconds

      assert.isTrue(resource2.getScalingProgress.calledOnce, 'should not be called again after returning success');

      assert.isTrue(resource1.getScalingProgress.calledTwice, 'should continue polling after 5 seconds');
      var resource1SuccessResult = {
        type: 'DynamoDB',
        name: 'table1',
        status: 'success'
      };
      resource1.getScalingProgress.callArgWith(0, resource1SuccessResult);
      assert.isTrue(callback.calledOnce, 'should invoke callback after pending resource completes');
      assert.isTrue(callback.calledWith(null, [resource1SuccessResult, resource2SuccessResult]), 'should return success result');
    });

  });

});