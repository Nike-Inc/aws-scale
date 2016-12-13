'use strict';
var sinon = require('sinon');
var assert = require('chai').assert;
var DynamoDB = require('../../../src/resources/DynamoDB');

describe('DynamoDB', function () {

    var params;
    beforeEach(function () {
        params = {
            TableName: 'TestTable'
        };
    });

    describe('module', function () {

        it('should be a function', function () {
            assert.isFunction(DynamoDB, 'module should be a function');
        });

        it('should return an object', function () {
            assert.isObject(DynamoDB(params), 'should return object');
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
});