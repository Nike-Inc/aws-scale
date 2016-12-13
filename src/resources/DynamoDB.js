'use strict';

module.exports = function (paramObj) {
    // Constructor
    var params = paramObj;
    if (typeof params !== 'object') {
        throw new Error("Constructor requires parameter object.");
    }
    if(typeof params.TableName !== 'string') {
        throw new Error("Missing params.TableName.");
    }

    function _getParams() {
        return params;
    }

    return {
        getParams: _getParams
    };
};