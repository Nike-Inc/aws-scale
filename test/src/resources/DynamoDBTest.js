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
      ignoreUnchangedCapacityUpdates: false,
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

    it('should return pending status if global indexes are still updating', function () {
      dynamoDB.getScalingProgress(callback);

      // Simulate response from AWS, global indexes still updating.
      var awsResponse = {
        Table: {
          TableStatus: 'ACTIVE',
          GlobalSecondaryIndexes: [
            {
              IndexName: 'index1',
              IndexStatus: 'ACTIVE'
            },
            {
              IndexName: 'index2',
              IndexStatus: 'UPDATING'
            }
          ]
        }
      };
      describeTableSpy.callArgWith(1, null, awsResponse);

      assert.isTrue(callback.calledOnce, 'should invoke callback after response from AWS');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'pending',
        message: 'TableStatus: ACTIVE - index1: ACTIVE - index2: UPDATING'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should send pending result if global indexes are updating');
    });

    it('should return pending status if global indexes and table are still updating', function () {
      dynamoDB.getScalingProgress(callback);

      // Simulate response from AWS, global indexes still updating.
      var awsResponse = {
        Table: {
          TableStatus: 'UPDATING',
          GlobalSecondaryIndexes: [
            {
              IndexName: 'index1',
              IndexStatus: 'ACTIVE'
            },
            {
              IndexName: 'index2',
              IndexStatus: 'UPDATING'
            }
          ]
        }
      };
      describeTableSpy.callArgWith(1, null, awsResponse);

      assert.isTrue(callback.calledOnce, 'should invoke callback after response from AWS');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'pending',
        message: 'TableStatus: UPDATING - index1: ACTIVE - index2: UPDATING'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should send pending result if global indexes and table are updating');
    });

    it('should return success if table AND global indexes are active', function () {
      dynamoDB.getScalingProgress(callback);

      var awsResponse = {
        Table: {
          TableStatus: 'ACTIVE',
          GlobalSecondaryIndexes: [
            {
              IndexName: 'index1',
              IndexStatus: 'ACTIVE'
            }
          ]
        }
      };
      describeTableSpy.callArgWith(1, null, awsResponse);

      assert.isTrue(callback.calledOnce, 'should invoke callback after response from AWS');
      var expectedResult = {
        type: 'DynamoDB',
        name: 'testTableName',
        status: 'success'
      };
      assert.isTrue(callback.calledWith(expectedResult), 'should send success result if global indexes and table are active');
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

    describe('ignoreUnchangedCapacityUpdates', function () {

      var describeTableSpy;

      beforeEach(function () {
        params.ignoreUnchangedCapacityUpdates = true;
        dynamoDB = new DynamoDB(params);
        describeTableSpy = sinon.spy();
        AWS.mock('DynamoDB', 'describeTable', describeTableSpy);
      });

      it('should attempt to describeTable before scaling if ignoreUnchangedCapacityUpdates true', function () {
        dynamoDB.scale(callback);

        assert.isFalse(updateTableSpy.called, 'should not update table until capacity values are checked');
        assert.isTrue(describeTableSpy.calledOnce, 'should attempt to describe the table');
        var expectedParams = {
          TableName: 'testTableName'
        };
        assert.isTrue(describeTableSpy.calledWith(expectedParams, sinon.match.func), 'should call describeTable with correct params');
      });

      it('should default to true', function () {
        params = {
          TableName: 'testTableName',
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        };
        dynamoDB = new DynamoDB(params);

        dynamoDB.scale(callback);

        assert.isFalse(updateTableSpy.called, 'should not update table until capacity values are checked');
        assert.isTrue(describeTableSpy.calledOnce, 'should attempt to describe the table');
      });

      it('should not modify table capacity if different from current values', function () {
        dynamoDB.scale(callback);

        // Desired capacity differs from current table settings.
        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 100,
              WriteCapacityUnits: 1
            }
          }
        };
        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isTrue(updateTableSpy.calledOnce, 'should update table after checking current table capacity');
        // Should not modify parameter object passed to update call.
        var expectedParams = {
          TableName: 'testTableName',
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        };
        assert.isTrue(updateTableSpy.calledOnce, 'should attempt to update the table after capacity check.');
        assert.isTrue(updateTableSpy.calledWith(expectedParams), 'should call table update with proper capacity');
      });

      it('should only invoke callback after table describe AND update', function () {
        dynamoDB.scale(callback);

        // Desired capacity differs from current table settings.
        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 100,
              WriteCapacityUnits: 1
            }
          }
        };
        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isFalse(callback.called, 'should not invoke callback until table update complete');

        updateTableSpy.callArgWith(1, null, {response: 'success'});

        assert.isTrue(callback.calledOnce, 'should invoke callback after table update');
      });

      it('should not attempt scale operation if table capacity matches current values and no global indexes were provided', function () {
        dynamoDB.scale(callback);

        // Desired capacity matches current table capacity, should skip update.
        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            }
          }
        };
        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isFalse(updateTableSpy.called, 'should ignore table update if no capacity change');
        assert.isTrue(callback.calledOnce, 'should invoke callback');
        var expectedResult = {
          type: 'DynamoDB',
          name: 'testTableName',
          status: 'success'
        };
        assert.isTrue(callback.calledWith(expectedResult), 'should return success result in callback');
      });

      it('should remove table capacity update if update matches current values and global indexes were provided', function () {
        params.GlobalSecondaryIndexUpdates = [
          {
            Update: {
              IndexName: 'globalIndex1',
              ProvisionedThroughput: {
                ReadCapacityUnits: 2,
                WriteCapacityUnits: 2
              }
            }
          }
        ];
        dynamoDB.scale(callback);

        // Desired capacity matches current table capacity, should remove table update but still do global index update.
        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            },
            GlobalSecondaryIndexes: [
              {
                IndexName: 'globalIndex1',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 1,
                  WriteCapacityUnits: 1
                }
              }
            ]
          }
        };
        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isTrue(updateTableSpy.calledOnce, 'should update the table');
        var expectedParams = {
          TableName: 'testTableName',
          GlobalSecondaryIndexUpdates: [
            {
              Update: {
                IndexName: 'globalIndex1',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 2,
                  WriteCapacityUnits: 2
                }
              }
            }
          ]
        };
        assert.isTrue(updateTableSpy.calledWith(expectedParams, sinon.match.func), 'should call update with global index throughput but not matching table throughput');
      });

      it('should remove any global indexes that match current values', function () {
        params.GlobalSecondaryIndexUpdates = [
          {
            Update: {
              IndexName: 'globalIndexChanged',
              ProvisionedThroughput: {
                ReadCapacityUnits: 2,
                WriteCapacityUnits: 2
              }
            }
          },
          {
            Update: {
              IndexName: 'globalIndexUnchanged',
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
              }
            }
          }
        ];
        dynamoDB.scale(callback);

        // Desired capacity matches current table capacity, should remove table update but still do global index update.
        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            },
            GlobalSecondaryIndexes: [
              {
                IndexName: 'globalIndexChanged',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 1,
                  WriteCapacityUnits: 1
                }
              },
              {
                IndexName: 'globalIndexUnchanged',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 1,
                  WriteCapacityUnits: 1
                }
              }
            ]
          }
        };
        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isTrue(updateTableSpy.calledOnce, 'should update the table');
        var expectedParams = {
          TableName: 'testTableName',
          GlobalSecondaryIndexUpdates: [
            {
              Update: {
                IndexName: 'globalIndexChanged',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 2,
                  WriteCapacityUnits: 2
                }
              }
            }
          ]
        };
        assert.isTrue(updateTableSpy.calledWith(expectedParams, sinon.match.func), 'should call update with only new global index updates');
      });

      it('should not attempt scale operation if all global indexes match current values and no table update is provided', function () {
        delete params.ProvisionedThroughput;
        params.GlobalSecondaryIndexUpdates = [
          {
            Update: {
              IndexName: 'globalIndexUnchanged',
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
              }
            }
          }
        ];

        dynamoDB.scale(callback);

        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            },
            GlobalSecondaryIndexes: [
              {
                IndexName: 'globalIndexUnchanged',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 1,
                  WriteCapacityUnits: 1
                }
              }
            ]
          }
        };
        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isFalse(updateTableSpy.called, 'should not update table if no indexes have new values');
      });

      it('should leave non-update global index operations untouched', function () {
        delete params.ProvisionedThroughput;
        params.GlobalSecondaryIndexUpdates = [
          {
            Delete: {
              IndexName: 'globalIndexNonUpdate'
            }
          }
        ];

        dynamoDB.scale(callback);

        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            },
            GlobalSecondaryIndexes: [
              {
                IndexName: 'globalIndexNonUpdate',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 1,
                  WriteCapacityUnits: 1
                }
              }
            ]
          }
        };
        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isTrue(updateTableSpy.calledOnce, 'should update the table');
        var expectedParams = {
          TableName: 'testTableName',
          GlobalSecondaryIndexUpdates: [
            {
              Delete: {
                IndexName: 'globalIndexNonUpdate'
              }
            }
          ]
        };
        assert.isTrue(updateTableSpy.calledWith(expectedParams, sinon.match.func), 'should ignore and pass on non-update operations to global indexes');
      });

      it('should not attempt scale operation if table capacity and all global indexes match current values', function () {
        params.GlobalSecondaryIndexUpdates = [
          {
            Update: {
              IndexName: 'globalIndexUnchanged',
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
              }
            }
          }
        ];

        dynamoDB.scale(callback);

        // All updates match current table values, do not scale.
        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            },
            GlobalSecondaryIndexes: [
              {
                IndexName: 'globalIndexUnchanged',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 1,
                  WriteCapacityUnits: 1
                }
              }
            ]
          }
        };
        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isFalse(updateTableSpy.called, 'should not update table if no updates actually exist');
        assert.isTrue(callback.calledOnce, 'should invoke callback');
        var expectedResult = {
          type: 'DynamoDB',
          name: 'testTableName',
          status: 'success'
        };
        assert.isTrue(callback.calledWith(expectedResult), 'should return success result in callback');
      });

      it('should not modify any global indexes provided but not found in the table describe', function () {
        params.GlobalSecondaryIndexUpdates = [
          {
            Update: {
              IndexName: 'globalIndexThatDoesNotExist',
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
              }
            }
          }
        ];

        dynamoDB.scale(callback);

        // Update contains global index that doesn't exist on the current table. Ignore.
        var describeTableResponse = {
          Table: {
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            },
            GlobalSecondaryIndexes: []
          }
        };

        describeTableSpy.callArgWith(1, null, describeTableResponse);

        assert.isTrue(updateTableSpy.calledOnce, 'should update the table');
        var expectedParams = {
          TableName: 'testTableName',
          GlobalSecondaryIndexUpdates: [
            {
              Update: {
                IndexName: 'globalIndexThatDoesNotExist',
                ProvisionedThroughput: {
                  ReadCapacityUnits: 1,
                  WriteCapacityUnits: 1
                }
              }
            }
          ]
        };
        assert.isTrue(updateTableSpy.calledWith(expectedParams, sinon.match.func), 'should ignore and pass on missing global indexes');
      });

      it('should ignore any errors and attempt to scale resource with no modifications to capacities', function () {
        dynamoDB.scale(callback);

        describeTableSpy.callArgWith(1, {error: 'DescribeTableError'});

        assert.isTrue(updateTableSpy.calledOnce, 'should update the table');
        var expectedParams = {
          TableName: 'testTableName',
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        };
        assert.isTrue(updateTableSpy.calledWith(expectedParams, sinon.match.func), 'should attempt update if an errors occur during table describe.');
      });

    });

  });
});