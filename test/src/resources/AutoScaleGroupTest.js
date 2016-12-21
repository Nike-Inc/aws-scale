'use strict';
var sinon = require('sinon');
var assert = require('chai').assert;
var AWS = require('aws-sdk-mock');
var AutoScaleGroup = require('../../../src/resources/AutoScaleGroup');

describe('AutoScaleGroup', function () {

  var params;
  var callback;
  var asg;

  beforeEach(function () {
    params = {
      AutoScalingGroupName: 'testASG',
      DesiredCapacity: 2
    };
    callback = sinon.spy();
    asg = new AutoScaleGroup(params);
  });

  afterEach(function () {
    AWS.restore();
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

  describe('getScalingProgress', function () {

    var describeASGSpy;

    beforeEach(function () {
      describeASGSpy = sinon.spy();
      AWS.mock('AutoScaling', 'describeAutoScalingGroups', describeASGSpy);
    });

    it('should look up ASG details via SDK', function () {
      asg.getScalingProgress(callback);

      assert.isTrue(describeASGSpy.calledOnce, 'should get ASG description from AWS');
      var expectedParams = {
        AutoScalingGroupNames: ['testASG']
      };
      assert.isTrue(describeASGSpy.calledWith(expectedParams, sinon.match.func), 'should pass proper params to describe call');
      assert.isFalse(callback.called, 'should not invoke callback until AWS responds');
    });

    it('should respond with success if InService instances equals desired capacity', function () {
      asg.getScalingProgress(callback);

      // Simulate desired instance InService count reached
      var awsResponse = {
        AutoScalingGroups: [
          {
            AutoScalingGroupName: 'testASG',
            Instances: [
              {
                InstanceId: 'instance1',
                LifecycleState: 'InService'
              },
              {
                InstanceId: 'instance2',
                LifecycleState: 'InService'
              }
            ]
          }
        ]
      };
      describeASGSpy.callArgWith(1, null, awsResponse);

      assert.isTrue(callback.calledOnce, 'should invoke callback after AWS response');
      var expectedResult = {
        type: 'AutoScaleGroup',
        name: 'testASG',
        status: 'success'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should return correct result');
    });

    it('should respond with pending if InService instances are below desired capacity', function () {
      asg.getScalingProgress(callback);

      var awsResponse = {
        AutoScalingGroups: [
          {
            AutoScalingGroupName: 'testASG',
            Instances: [
              {
                InstanceId: 'instance1',
                LifecycleState: 'InService'
              },
              {
                InstanceId: 'instance2',
                LifecycleState: 'Pending'
              }
            ]
          }
        ]
      };
      describeASGSpy.callArgWith(1, null, awsResponse);

      assert.isTrue(callback.calledOnce, 'should invoke callback after AWS response');
      var expectedResult = {
        type: 'AutoScaleGroup',
        name: 'testASG',
        status: 'pending',
        message: 'InService: 1 Pending: 1'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should return correct result');
    });

    it('should respond with pending if InService instances are above desired capacity', function () {
      asg.getScalingProgress(callback);

      var awsResponse = {
        AutoScalingGroups: [
          {
            AutoScalingGroupName: 'testASG',
            Instances: [
              {
                InstanceId: 'instance1',
                LifecycleState: 'InService'
              },
              {
                InstanceId: 'instance2',
                LifecycleState: 'InService'
              },
              {
                InstanceId: 'instance3',
                LifecycleState: 'InService'
              },
              {
                InstanceId: 'instance4',
                LifecycleState: 'Terminated'
              }
            ]
          }
        ]
      };
      describeASGSpy.callArgWith(1, null, awsResponse);

      assert.isTrue(callback.calledOnce, 'should invoke callback after AWS response');
      var expectedResult = {
        type: 'AutoScaleGroup',
        name: 'testASG',
        status: 'pending',
        message: 'InService: 3 Terminated: 1'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should return correct result');
    });

    it('should respond with failure if AWS returns an error', function () {
      asg.getScalingProgress(callback);

      describeASGSpy.callArgWith(1, {awsError: 'Error from AWS'});

      assert.isTrue(callback.calledOnce, 'should invoke callback after AWS response');
      var expectedResult = {
        type: 'AutoScaleGroup',
        name: 'testASG',
        status: 'failure',
        error: {awsError: 'Error from AWS'}
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should return correct result');
    });

  });

  describe('scale', function () {

    var desiredCapacitySpy;
    var updateASGSpy;

    beforeEach(function () {
      desiredCapacitySpy = sinon.spy();
      updateASGSpy = sinon.spy();
      AWS.mock('AutoScaling', 'setDesiredCapacity', desiredCapacitySpy);
      AWS.mock('AutoScaling', 'updateAutoScalingGroup', updateASGSpy);
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

    describe('setMinSize feature', function () {

      beforeEach(function () {
        params.setMinSize = true;
        asg = new AutoScaleGroup(params);
      });

      it('should update the auto scale group\'s min size if true before the scale attempt', function () {
        asg.scale(callback);

        assert.isFalse(desiredCapacitySpy.called, 'should not update desired capacity before min size update.');
        assert.isTrue(updateASGSpy.calledOnce, 'should update the auto scale group.');
        var expectedUpdateParams = {
          AutoScalingGroupName: 'testASG',
          MinSize: 2 // Matches desiredCapacity
        };
        assert.isTrue(updateASGSpy.calledWith(expectedUpdateParams, sinon.match.func), 'should update ASG with correct parameters');
      });

      it('should scale auto scale group after successfully changing min size', function () {
        asg.scale(callback);

        // Successful response from ASG min size update
        updateASGSpy.callArgWith(1, null, {status: 'successfully updated ASG min size.'});

        assert.isTrue(desiredCapacitySpy.calledOnce, 'should set desired capacity after update.');
        var expectedParams = {
          AutoScalingGroupName: 'testASG',
          DesiredCapacity: 2 // Matches desiredCapacity
        };
        assert.isTrue(desiredCapacitySpy.calledWith(expectedParams, sinon.match.func), 'should update capacity with correct params.');
      });

      it('should return a success event after updating min size and desired capacity', function () {
        asg.scale(callback);

        // Successful response from ASG min size update
        updateASGSpy.callArgWith(1, null, {status: 'successfully updated ASG min size.'});

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

      it('should return an error response if the min size update fails', function () {
        asg.scale(callback);

        updateASGSpy.callArgWith(1, {errorResponse: 'failed to change min size'});
        assert.isTrue(callback.calledOnce, 'callback should be invoked once after return from AWS.');
        var expectedResult = {
          type: 'AutoScaleGroup',
          name: 'testASG',
          status: 'failure',
          error: {errorResponse: 'failed to change min size'}
        };
        assert.isTrue(callback.calledWith(expectedResult), 'should return failure result object.');
      });

      it('should return an error response if the desired capacity update fails', function () {
        asg.scale(callback);

        updateASGSpy.callArgWith(1, null, {status: 'successfully updated ASG min size.'});
        desiredCapacitySpy.callArgWith(1, {errorResponse: 'failed to update desired capacity'});

        assert.isTrue(callback.calledOnce, 'callback should be invoked once after return from AWS.');
        var expectedResult = {
          type: 'AutoScaleGroup',
          name: 'testASG',
          status: 'failure',
          error: {errorResponse: 'failed to update desired capacity'}
        };
        assert.isTrue(callback.calledWith(expectedResult), 'should return failure result object.');
      });

    });

  });
});