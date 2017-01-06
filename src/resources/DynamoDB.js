'use strict';

var AWS = require('aws-sdk');
var _ = require('lodash');

/**
 * Updates a DynamoDB table read/write throughput.
 *
 * @param awsParams - parameter object for AWS SDK DynamoDB.updateTable function.
 * @constructor
 */
var DynamoDB = function (awsParams) {
  if (typeof awsParams !== 'object') {
    throw new Error('Constructor requires a AWS JavaScript SDK DynamoDB.updateTable param object.');
  }
  if (typeof awsParams.TableName !== 'string') {
    throw new Error('Missing params.TableName.');
  }


  this.ignoreUnchangedCapacityUpdates = true;
  if (awsParams.ignoreUnchangedCapacityUpdates !== undefined) {
    this.ignoreUnchangedCapacityUpdates = awsParams.ignoreUnchangedCapacityUpdates;
  }

  this.params = awsParams;
  delete this.params.ignoreUnchangedCapacityUpdates;
};

/**
 * Returns the parameter object passed to the constructor.
 * @returns {*} - the parameter object passed to the constructor.
 */
DynamoDB.prototype.getParams = function () {
  return this.params;
};

/**
 * Gets the status of the scaling operation on the table.
 *
 * @param {function} callback - invoked once the current scale status is confirmed. Returns the following result
 * parameter:
 * {
 *     type: 'DynamoDB',
 *     name: <DynamoTableName>,
 *     status: <success || failure || pending>
 *
 *     // If status == pending:
 *     message: 'Helpful message about scaling progress.'
 *
 *     // If status == failure:
 *     error: <error object from AWS SDK>
 * }
 *
 */
DynamoDB.prototype.getScalingProgress = function(callback) {
  var self = this;
  var dynamoDB = new AWS.DynamoDB();

  dynamoDB.describeTable({TableName: this.params.TableName}, function (err, data) {
    var result = {
      type: 'DynamoDB',
      name: self.params.TableName
    };

    if (err) {
      result.status = 'failure';
      result.error = err;
      return callback(result);
    }

    switch (data.Table.TableStatus) {
      case 'UPDATING':
        result.status = 'pending';
        result.message = 'TableStatus: UPDATING';
        break;
      case 'ACTIVE':
        result.status = 'success';
        break;
      case 'CREATING':
      case 'DELETING':
        result.status = 'failure';
        result.error = 'Unexpected TableStatus: ' + data.Table.TableStatus;
        break;
    }

    callback(result);
  });
};

/**
 * Scales the underlying dynamoDB table. When complete, invokes the callback with a result object.
 * Object has the following structure:
 *
 * {
 *     type: 'DynamoDB',
 *     name: <DynamoTableName>,
 *     status: <success || failure>
 *
 *     // If status == failure:
 *     error: <error object from AWS SDK>
 * }
 *
 * @param callback
 */
DynamoDB.prototype.scale = function (callback) {
  var self = this;
  var dynamoDB = new AWS.DynamoDB();

  // Check current table capacity settings and remove any updates that already match current values.
  if (this.ignoreUnchangedCapacityUpdates) {
    checkCurrentThroughput();
  } else {
    updateTable();
  }

  /**
   * Checks the current table and global index throughput. If any of the updates match the current table/index
   * throughput values, the non-updates are removed. This prevents needless errors from AWS when resources
   * are already scaled to desired levels in DynamoDB.
   */
  function checkCurrentThroughput() {
    dynamoDB.describeTable({TableName: self.params.TableName}, function (err, data) {
      // On any describe error, attempt to update.
      if (err) {
        return updateTable();
      }

      var currentThroughput = data.Table.ProvisionedThroughput;
      var newThroughput = self.params.ProvisionedThroughput || {};

      // Check current table throughput and remove update if values match.
      var tableReadUnchanged = currentThroughput.ReadCapacityUnits === newThroughput.ReadCapacityUnits;
      var tableWriteUnchange = currentThroughput.WriteCapacityUnits === newThroughput.WriteCapacityUnits;
      if (tableReadUnchanged && tableWriteUnchange) {
        delete self.params.ProvisionedThroughput;
      }

      // Check any global indexes and remove update if values match current throughput.
      var globalIndexUpdates = self.params.GlobalSecondaryIndexUpdates || [];
      self.params.GlobalSecondaryIndexUpdates = _.filter(globalIndexUpdates, function (globalIndex) {
        // If global index operation is not an update, ignore and move on.
        if (!globalIndex.Update) {
          return true;
        }
        var newIndexThroughput = globalIndex.Update.ProvisionedThroughput;

        var indexDescription = _.find(data.Table.GlobalSecondaryIndexes, {IndexName: globalIndex.Update.IndexName});
        // Index not found in table describe, ignore and move on.
        if (!indexDescription) {
          return true;
        }
        var currentIndexThroughput = indexDescription.ProvisionedThroughput;

        var indexReadUnchange = currentIndexThroughput.ReadCapacityUnits === newIndexThroughput.ReadCapacityUnits;
        var indexWriteUnchange = currentIndexThroughput.WriteCapacityUnits === newIndexThroughput.WriteCapacityUnits;
        return !(indexReadUnchange && indexWriteUnchange);
      });
      // Remove global index changes if no real updates remain.
      if (self.params.GlobalSecondaryIndexUpdates.length === 0) {
        delete self.params.GlobalSecondaryIndexUpdates;
      }

      // If no updates remain (because all updates matched current values), return success without attempting update.
      if (!self.params.ProvisionedThroughput && !self.params.GlobalSecondaryIndexUpdates) {
        var result = {
          type: 'DynamoDB',
          name: self.params.TableName,
          status: 'success'
        };
        return callback(result);
      }

      updateTable();
    });
  }

  /**
   * Updates the throughput on the table.
   */
  function updateTable() {
    dynamoDB.updateTable(self.params, function (err) {
      var result = {
        type: 'DynamoDB',
        name: self.params.TableName,
        status: 'success'
      };

      if (err) {
        result.status = 'failure';
        result.error = err;
      }

      callback(result);
    });
  }
};

module.exports = DynamoDB;