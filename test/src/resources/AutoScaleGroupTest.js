'use strict';
var sinon = require('sinon');
var assert = require('chai').assert;
var AWS = require('aws-sdk-mock');
var AutoScaleGroup = require('../../../src/resources/AutoScaleGroup');

describe('AutoScaleGroup', function () {

  var params;
  beforeEach(function () {
    params = {
      AutoScalingGroupName: 'testASG',
      DesiredCapacity: 1
    };
  });

  describe('module', function () {

    it('should be a function', function () {
      assert.isFunction(AutoScaleGroup, 'module should be a function');
    });

  });

  describe('Constructor', function () {

    it('should require parameter object', function () {
      function test() {
        new AutoScaleGroup();
      }

      assert.throws(test, 'Constructor requires a AWS JavaScript SDK AutoScaling.setDesiredCapacity param object.');
    });

    it('should require a ASG name in param object', function () {
      function test() {
        new AutoScaleGroup({});
      }

      assert.throws(test, 'Missing params.AutoScalingGroupName.');
    });

    it('should require a DesiredCapacity in param object', function () {
      function test() {
        new AutoScaleGroup({AutoScalingGroupName: 'testASG'});
      }

      assert.throws(test, 'Missing params.DesiredCapacity.');
    });

  });


  describe('scale', function () {

    var asg;
    var callback;
    var desiredCapacitySpy;

    beforeEach(function () {
      asg = new AutoScaleGroup(params);
      callback = sinon.spy();
      desiredCapacitySpy = sinon.spy();
      AWS.mock('AutoScaling', 'setDesiredCapacity', desiredCapacitySpy);
    });

    afterEach(function () {
      AWS.restore();
    });

    it('should call AutoScaleGroup desired capacity with parameter object', function () {
      asg.scale();


      assert.isTrue(desiredCapacitySpy.calledOnce, 'should attempt update call via AWS sdk.');
      assert.isTrue(desiredCapacitySpy.calledWith(params, sinon.match.func), 'should include correct parameters.');
    });

    it('should return successful status object via callback when complete', function () {
      asg.scale(callback);

      assert.isFalse(callback.called, 'callback should not be invoked before response from AWS.');
      desiredCapacitySpy.callArgWith(1, null, {response: 'success'});
      assert.isTrue(callback.calledOnce, 'callback should be invoked once after return from AWS.');
      var expectedResult = {
        type: 'AutoScaleGroup',
        name: 'testASG',
        status: 'success'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should return successful result object.');
    });

    it('should return error object via callback if failure', function () {
      asg.scale(callback);

      desiredCapacitySpy.callArgWith(1, {errorResponse: 'awsError'});
      assert.isTrue(callback.calledOnce, 'callback should be invoked once after return from AWS.');
      var expectedResult = {
        type: 'AutoScaleGroup',
        name: 'testASG',
        status: 'failure',
        error: {errorResponse: 'awsError'}
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should return failure result object.');
    });

  });
});