var { test, expect } = require('@jest/globals');
var lock = require('../index.js');
var AWSMock = require('aws-sdk-mock');
var AWS = require('aws-sdk');
var sinon = require('sinon');
var assert = require('chai').assert;
const { update } = require('lodash');
const { EnvironmentCredentials } = require('aws-sdk');

AWSMock.setSDKInstance(AWS);
lock.setDynamoDelegate(new AWS.DynamoDB());
AWSMock.mock("DynamoDB", 'putItem', null);

jest.setTimeout(30000)

test('obtainLock Writes to the Dynamo Lock Table', async () => {
    const updateSpy = sinon.spy();

    //Set Mocker Behavior for this test
    AWSMock.remock('DynamoDB', 'putItem', (params, callback) => {      
      updateSpy(params, null);
      callback(null, {pk: 'foo', sk: 'bar'});  //Provide [Errors, Return Values] To Object That Calls AWS Mocker
    });
    lock.setDynamoDelegate(new AWS.DynamoDB());

    //Object under test
    let dyLock = (new lock("orion"));
    await dyLock.obtainLock();

    assert.isTrue(updateSpy.calledOnce, 'test subject should have invoked the spy once, trying to modify DynamoDB Table');
    assert.isTrue(updateSpy.calledWithMatch(sinon.match.has("TableName", 'dynamo_locks')), 'should have an arg with Expected Table Name Property');
})


// "LockName": {
//   S: "dynamo_lock_" + this.lockName
//  }, 


test('successful obtainLock Writes an expiration Time That is 1 hour plus NOW by default', async () => {
  var mockerObservedExpirationTimeSentToAWS = "0";
  const updateSpy2 = sinon.spy();

  //Set Mocker Behavior for this test
  //AWSMockp.remock
  AWSMock.remock('DynamoDB', 'putItem', (params, callback) => {      
    mockerObservedExpirationTimeSentToAWS = params.Item.ExpirationTime.N;

    updateSpy2(params, null);
    callback(null, {pk: 'foo', sk: 'bar'});  //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = undefined;
  let dyLock = (new lock("orion"));
  await dyLock.obtainLock();

  assert.isTrue(updateSpy2.calledOnce, 'test subject should have invoked the spy once, trying to modify DynamoDB Table');

  let currentTime = new Date().getTime();
  expect(new Date(parseInt(mockerObservedExpirationTimeSentToAWS)*1000 ).getTime()).toBeGreaterThan( currentTime + 50*60*1000);
  expect(new Date(parseInt(mockerObservedExpirationTimeSentToAWS)*1000).getTime()).toBeLessThan( currentTime + 70*60*1000);
})

test('successful obtainLock Writes an expiration Time That is 30 minutes plus NOW when OVERRIDE is set', async () => {
  var mockerObservedExpirationTimeSentToAWS = "0";
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock('DynamoDB', 'putItem', (params, callback) => {      
    mockerObservedExpirationTimeSentToAWS = params.Item.ExpirationTime.N;

    updateSpy(params, null);
    callback(null, {pk: 'foo', sk: 'bar'});  //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 30*60*1000;
  let dyLock = (new lock("orion"));
  await dyLock.obtainLock();

  assert.isTrue(updateSpy.calledOnce, 'test subject should have invoked the spy once, trying to modify DynamoDB Table');

  let currentTime = new Date().getTime();
  expect(new Date(parseInt(mockerObservedExpirationTimeSentToAWS)*1000 ).getTime()).toBeGreaterThan( currentTime + 20*60*1000);
  expect(new Date(parseInt(mockerObservedExpirationTimeSentToAWS)*1000).getTime()).toBeLessThan( currentTime + 40*60*1000);
})

