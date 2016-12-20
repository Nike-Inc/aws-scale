'use strict';
var sinon = require('sinon');
var assert = require('chai').assert;
var AWS = require('aws-sdk-mock');
var DynamoDB = require('../../../src/resources/DynamoDB');

describe('DynamoDB', function () {

  var params;
  var callback;
  var dynamoDB;

  beforeEach(function () {
    callback = sinon.spy();
    params = {
      TableName: 'testTableName',
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    };
    dynamoDB = new DynamoDB(params);
  });

  afterEach(function () {
    AWS.restore();
  });

  describe('module', function () {

    it('should be a function', function () {
      assert.isFunction(DynamoDB, 'module should be a function');
    });

  });

  describe('Constructor', function () {

    it('should require parameter object', function () {
      function test() {
        new DynamoDB();
      }

      assert.throws(test, 'Constructor requires a AWS JavaScript SDK DynamoDB.updateTable param object.');
    });

    it('should require a DynamoDB table name in param object', function () {
      function test() {
        new DynamoDB({});
      }

      assert.throws(test, 'Missing params.TableName.');
    });

  });

  describe('getParams', function () {

    it('should return the parameter object passed in during construction', function () {
      var params = {
        TableName: 'testTableName'
      };

      var dynamoDB = new DynamoDB(JSON.parse(JSON.stringify(params)));

      assert.deepEqual(dynamoDB.getParams(), params);
    });

    it('should not be modified by other instances', function () {
      var params = {
        TableName: 'testTableName'
      };

      var dynamoDB = new DynamoDB(JSON.parse(JSON.stringify(params)));
      new DynamoDB({TableName: 'differentTableName'});

      assert.deepEqual(dynamoDB.getParams(), params);
    });

  });

  describe('getScalingProgress', function () {
    var describeTableSpy;

    beforeEach(function () {
      describeTableSpy = sinon.spy();
      AWS.mock('DynamoDB', 'describeTable', describeTableSpy);
    });

    it('should call DynamoDB describe table', function () {
      dynamoDB.getScalingProgress(callback);

      assert.isTrue(describeTableSpy.called, 'should make call to describeTable.');
      var expectedParams = {
        TableName: 'testTableName'
      };
      assert.isTrue(describeTableSpy.calledWith(expectedParams, sinon.match.func), 'should send correct params.');
      assert.isFalse(callback.called, 'should not call callback until response from AWS');
    });

    it('should return pending status if table is updating', function () {
      dynamoDB.getScalingProgress(callback);

      // Simulate response from AWS
      describeTableSpy.callArgWith(1, null, {Table: {TableStatus: 'UPDATING'}});

      assert.isTrue(callback.calledOnce, 'should invoke callback after response from AWS');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'pending',
        message: 'TableStatus: UPDATING'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should send correct result back');
    });

    it('should return success status if table is active', function () {
      dynamoDB.getScalingProgress(callback);

      // Simulate response from AWS
      describeTableSpy.callArgWith(1, null, {Table: {TableStatus: 'ACTIVE'}});

      assert.isTrue(callback.calledOnce, 'should invoke callback after response from AWS');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'success'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should send correct result back');
    });

    it('should return failure if error returned from AWS', function () {
      dynamoDB.getScalingProgress(callback);

      // Simulate response from AWS
      describeTableSpy.callArgWith(1, {awsError: 'AWS Error'});

      assert.isTrue(callback.calledOnce, 'should invoke callback after response from AWS');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'failure',
        error: {awsError: 'AWS Error'}
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should send correct result back');
    });

    it('should return failure if table is creating', function () {
      dynamoDB.getScalingProgress(callback);

      // Simulate response from AWS
      describeTableSpy.callArgWith(1, null, {Table: {TableStatus: 'CREATING'}});

      assert.isTrue(callback.calledOnce, 'should invoke callback after response from AWS');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'failure',
        error: 'Unexpected TableStatus: CREATING'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should send correct result back');
    });

    it('should return failure if table is deleting', function () {
      dynamoDB.getScalingProgress(callback);

      // Simulate response from AWS
      describeTableSpy.callArgWith(1, null, {Table: {TableStatus: 'DELETING'}});

      assert.isTrue(callback.calledOnce, 'should invoke callback after response from AWS');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'failure',
        error: 'Unexpected TableStatus: DELETING'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should send correct result back');
    });

  });

  describe('scale', function () {

    var updateTableSpy;

    beforeEach(function () {
      updateTableSpy = sinon.spy();
      AWS.mock('DynamoDB', 'updateTable', updateTableSpy);
    });

    it('should call DynamoDB update table with parameter object', function () {
      dynamoDB.scale(callback);

      assert.isTrue(updateTableSpy.calledOnce, 'should attempt update call via AWS sdk.');
      assert.isTrue(updateTableSpy.calledWith(params, sinon.match.func), 'should include correct parameters.');
    });

    it('should return successful status object via callback when complete', function () {
      dynamoDB.scale(callback);

      assert.isFalse(callback.called, 'callback should not be invoked before response from AWS.');
      updateTableSpy.callArgWith(1, null, {response: 'success'});
      assert.isTrue(callback.calledOnce, 'callback should be invoked once after return from AWS.');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'success'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should return successful result object.');
    });

    it('should return error object via callback if failure', function () {
      dynamoDB.scale(callback);

      updateTableSpy.callArgWith(1, {errorResponse: 'awsError'});
      assert.isTrue(callback.calledOnce, 'callback should be invoked once after return from AWS.');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'failure',
        error: {errorResponse: 'awsError'}
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should return failure result object.');
    });

  });
});