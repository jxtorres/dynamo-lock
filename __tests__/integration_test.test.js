var { test, expect } = require('@jest/globals');
var lock = require('../index.js');

var AWS = require('aws-sdk');
var sinon = require('sinon');
var assert = require('chai').assert;
const { update } = require('lodash');
const { EnvironmentCredentials } = require('aws-sdk');

var integrationDisabled = true;


// //Uncomment this section and populate data to run the integration tests
// integrationDisabled = false;
// process.env.AWS_ACCESS_KEY_ID = "";
// process.env.AWS_SECRET_ACCESS_KEY = "";
// process.env.AWS_DEFAULT_REGION = "";

lock.setDynamoDelegate(new AWS.DynamoDB());



jest.setTimeout(30000)

test('obtainLock Writes to the Dynamo Lock Table', async () => {
    if(integrationDisabled)
        return;



    //Object under test
    let dyLock = (new lock("orion"));
    await dyLock.obtainLock();
    await dyLock.releaseLock();

    assert.isFalse(dyLock.isHoldingLock, 'test subject should not be holding the lock.');
})