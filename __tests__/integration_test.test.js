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
// process.env.AWS_ACCESS_KEY_ID = ""
// process.env.AWS_SECRET_ACCESS_KEY = ""
// process.env.AWS_DEFAULT_REGION = "us-east-1";

AWS.config.update({region:'us-east-2'});

lock.setDynamoDelegate(new AWS.DynamoDB());

var sleep = function(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
};

jest.setTimeout(30000)

test('obtainLock acquires lock and never releases', async () => {
    if(integrationDisabled)
        return;


    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 0.2*60*1000;
    let dyLock = (new lock("orion"));
    let resp = await dyLock.obtainLock();
    //await dyLock.releaseLock();
    console.log('resp', resp, dyLock.uuid);
    assert.isTrue(dyLock.isHoldingLock, 'test subject should not be holding the lock.');
})

test('obtainLock will fail to acquire lock', async () => {
    if(integrationDisabled)
        return;



    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 0.2*60*1000;
    let dyLock = (new lock("orion"));
    let resp = await dyLock.obtainLock();
    //await dyLock.releaseLock();
    console.log('resp', resp, dyLock.uuid);
    assert.isFalse(dyLock.isHoldingLock, 'test subject should not be holding the lock.');
})

test('some wait time', async () => {
    if(integrationDisabled)
        return;

    await sleep(25000);

})

test('some wait time', async () => {
    if(integrationDisabled)
        return;

    await sleep(25000);

})

test('obtainLock acquires lock and releases after end of rest', async () => {
    if(integrationDisabled)
        return;

    await sleep(20000);


    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 0.2*60*1000;
    let dyLock = (new lock("orion"));
    let resp = await dyLock.obtainLock();
    await dyLock.releaseLock();
    console.log('resp', resp, dyLock.uuid);
    assert.isTrue(resp, 'tlock was acquired');
    assert.isFalse(dyLock.isHoldingLock, 'lock was released.');

})

test('easy grab and release', async () => {
    if(integrationDisabled)
        return;


    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 0.2*60*1000;
    let dyLock = (new lock("orion"));
    let resp = await dyLock.obtainLock();
    await dyLock.releaseLock();
    console.log('resp', resp, dyLock.uuid);
    assert.isTrue(resp, 'tlock was acquired');
    assert.isFalse(dyLock.isHoldingLock, 'lock was released.');

})

test('obtainLock acquires lock and never releases with 90 second ttl', async () => {
    if(integrationDisabled)
        return;



    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 1*60*1000;
    let dyLock = (new lock("orion"));
    let resp = await dyLock.obtainLock();
    //await dyLock.releaseLock();
    console.log('resp', resp, dyLock.uuid);
    assert.isTrue(dyLock.isHoldingLock, 'test subject should not be holding the lock.');
})


test('obtainLock will fail to acquire lock', async () => {
    if(integrationDisabled)
        return;



    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 0.2*60*1000;
    let dyLock = (new lock("orion"));
    let resp = await dyLock.obtainLock();
    //await dyLock.releaseLock();
    console.log('resp', resp, dyLock.uuid);
    assert.isFalse(dyLock.isHoldingLock, 'test subject should not be holding the lock.');
})

test('some wait time', async () => {
    if(integrationDisabled)
        return;

    await sleep(25000);

})

test('some wait time', async () => {
    if(integrationDisabled)
        return;

    await sleep(25000);

})

test('obtainLock fails lock for rest is not long enough or maybe it works but release regardless', async () => {
    if(integrationDisabled)
        return;

    await sleep(20000);


    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 0.2*60*1000;
    let dyLock = (new lock("orion"));
    let resp = await dyLock.obtainLock();
    await dyLock.releaseLock();
    console.log('resp', resp, dyLock.uuid);
    //assert.isFalse(resp, 'tlock was acquired');
    assert.isFalse(dyLock.isHoldingLock, 'lock was released.');

})

test('obtainLock now works as longer ttl expires', async () => {
    if(integrationDisabled)
        return;

    await sleep(25000);


    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 0.2*60*1000;
    let dyLock = (new lock("orion"));
    let resp = await dyLock.obtainLock();
    await dyLock.releaseLock();
    console.log('resp', resp, dyLock.uuid);
    assert.isTrue(resp, 'tlock was acquired');
    assert.isFalse(dyLock.isHoldingLock, 'lock was released.');

})

test('show two locks fighting each other', async () => {
    if(integrationDisabled)
        return;



    //Object under test
    process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 0.2*60*1000;
    let orionLock1 = (new lock("orion"));
    let orionLock2 = (new lock("orion"));
    let resp1 = await orionLock1.obtainLock();
    let resp2 = await orionLock2.obtainLock();
    assert.isTrue(resp1, 'lock1 grabbed the lock')
    assert.isFalse(resp2, 'lock2 failed to get lock');

    await orionLock1.releaseLock();
    resp2 = await orionLock2.obtainLock();
    assert.isTrue(resp2, 'lock2 got the lock');
    
    assert.isTrue(orionLock2.isHoldingLock, 'lock is held by lock2.');
    let releaseResp = await orionLock2.releaseLock();
    assert.isTrue(releaseResp, 'lock released');
    releaseResp = await orionLock2.releaseLock();
    assert.isFalse(releaseResp, 'lock was not able to be released again, not held..');

})