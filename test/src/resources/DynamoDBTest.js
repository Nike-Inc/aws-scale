'use strict';
var sinon = require('sinon');
var assert = require('chai').assert;
var AWS = require('aws-sdk-mock');
var DynamoDB = require('../../../src/resources/DynamoDB');

describe('DynamoDB', function () {

  var params;
  beforeEach(function () {
    params = {
      TableName: 'testTableName',
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    };
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

      assert.throws(test, 'Constructor requires parameter object.');
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

  describe('scale', function () {

    var dynamoDB;
    var callback;
    var updateTableSpy;

    beforeEach(function () {
      dynamoDB = new DynamoDB(params);
      callback = sinon.spy();
      updateTableSpy = sinon.spy();
      AWS.mock('DynamoDB', 'updateTable', updateTableSpy);
    });

    afterEach(function () {
      AWS.restore();
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
      assert.isTrue(callback.calledWith(expectedResult), 'should return successful result object.');
    });

  });
});