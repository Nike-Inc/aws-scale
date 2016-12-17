/**
 * Aws-scale module. Maps all modules to a single, importable one for NPM module.
 */

exports.ResourceSet = require('./src/ResourceSet');

// Resources
exports.DynamoDB = require('./src/resources/DynamoDB');
exports.AutoScaleGroup = require('./src/resources/AutoScaleGroup');