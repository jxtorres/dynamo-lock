var { test, expect } = require("@jest/globals");
var lock = require("../index.js");
var AWSMock = require("aws-sdk-mock");
var AWS = require("aws-sdk");
var sinon = require("sinon");
var assert = require("chai").assert;
const { update } = require("lodash");
const { EnvironmentCredentials } = require("aws-sdk");

AWSMock.setSDKInstance(AWS);
lock.setDynamoDelegate(new AWS.DynamoDB());
AWSMock.mock("DynamoDB", "putItem", null);
AWSMock.mock("DynamoDB", "describeTable", (params, callback) => {
  callback(null, { Table: { ItemCount: 0 }, sk: "bar" }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
});
AWSMock.mock("DynamoDB", "describeTimeToLive", (params, callback) => {
  callback(null, {
    TimeToLiveDescription: { TimeToLiveStatus: "ENABLED" },
    sk: "bar",
  }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
});

jest.setTimeout(30000);

test("obtainLock Writes to the Dynamo Lock Table", async () => {
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock("DynamoDB", "putItem", (params, callback) => {
    updateSpy(params, null);
    callback(null, { pk: "foo", sk: "bar" }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  let dyLock = new lock("orion");
  await dyLock.obtainLock();

  assert.isTrue(
    updateSpy.calledOnce,
    "test subject should have invoked the spy once, trying to modify DynamoDB Table"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(sinon.match.has("TableName", "dynamo_locks")),
    "should have an arg with Expected Table Name Property"
  );
});

test("obtainLock Returns True for successful capture of the lock, or just no error", async () => {
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock("DynamoDB", "putItem", (params, callback) => {
    updateSpy(params, null);
    callback(null, {}); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  let dyLock = new lock("orion");
  let resp = await dyLock.obtainLock();

  assert.isTrue(resp, "True value should be returned by obj");
  assert.isTrue(
    updateSpy.calledOnce,
    "test subject should have invoked the spy once, trying to modify DynamoDB Table"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(sinon.match.has("TableName", "dynamo_locks")),
    "should have an arg with Expected Table Name Property"
  );
});

test("obtainLock Returns False for failed capture of the lock, or just any error", async () => {
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock("DynamoDB", "putItem", (params, callback) => {
    updateSpy(params, null);
    callback({ ErrorMessage: "The conditional request failed" }, {}); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  let dyLock = new lock("orion");
  let resp = await dyLock.obtainLock();

  assert.isFalse(resp, "True value should be returned by obj");
  assert.isTrue(
    updateSpy.calledOnce,
    "test subject should have invoked the spy once, trying to modify DynamoDB Table"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(sinon.match.has("TableName", "dynamo_locks")),
    "should have an arg with Expected Table Name Property"
  );
});

test("obtainLock Writes an item with the correct lock name", async () => {
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock("DynamoDB", "putItem", (params, callback) => {
    updateSpy(params, null);
    callback(null, { pk: "foo", sk: "bar" }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  let dyLock = new lock("orion");
  await dyLock.obtainLock();

  assert.isTrue(
    updateSpy.calledOnce,
    "test subject should have invoked the spy once, trying to modify DynamoDB Table"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(sinon.match.has("TableName", "dynamo_locks")),
    "should have an arg with Expected Table Name Property"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(
      sinon.match.has(
        "Item",
        sinon.match.has("LockName", sinon.match.has("S", "dynamo_lock_orion"))
      )
    ),
    "should have an item with some albumtitle structure, regexp"
  );
});

test("obtainLock only calls for TTL Settings on first invocation ", async () => {
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock("DynamoDB", "describeTimeToLive", (params, callback) => {
    updateSpy(params, null);
    callback(null, { TimeToLiveDescription: { TimeToLiveStatus: "ENABLED" } }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  let dyLock = new lock("orion");
  await dyLock.obtainLock();
  await dyLock.obtainLock();
  await dyLock.obtainLock();
  await dyLock.obtainLock();

  assert.isTrue(
    updateSpy.calledOnce,
    "test subject should have invoked the spy once, trying to fetch settings"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(sinon.match.has("TableName", "dynamo_locks")),
    "should have an arg with Expected Table Name Property"
  );
});

test("obtainLock only calls for TTL Settings on first invocation and will only call update once ", async () => {
  const updateSpy = sinon.spy();
  const readSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock("DynamoDB", "describeTimeToLive", (params, callback) => {
    readSpy(params, null);
    callback(null, { TimeToLiveDescription: { TimeToLiveStatus: "DISABLED" } }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  AWSMock.mock("DynamoDB", "updateTimeToLive", (params, callback) => {
    updateSpy(params, null);
    callback(null, {}); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  let dyLock = new lock("orion");
  await dyLock.obtainLock();
  await dyLock.obtainLock();
  await dyLock.obtainLock();
  await dyLock.obtainLock();

  assert.isTrue(
    updateSpy.callCount == 4,
    "test subject should have invoked the spy once, trying to write settings"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(sinon.match.has("TableName", "dynamo_locks")),
    "should have an arg with Expected Table Name Property"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(
      sinon.match.has(
        "TimeToLiveSpecification",
        sinon.match.has("AttributeName", "ExpirationTime")
      )
    ),
    "should have an arg with Expected Attribute Property"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(
      sinon.match.has(
        "TimeToLiveSpecification",
        sinon.match.has("Enabled", true)
      )
    ),
    "should have enabled Property"
  );
  assert.isTrue(
    readSpy.callCount == 4,
    "test subject should have invoked the spy once, trying to fetch settings"
  );
});

// "LockName": {
//   S: "dynamo_lock_" + this.lockName
//  },

test("successful obtainLock Writes an expiration Time That is 1 hour plus NOW by default", async () => {
  var mockerObservedExpirationTimeSentToAWS = "0";
  const updateSpy2 = sinon.spy();

  //Set Mocker Behavior for this test
  //AWSMockp.remock
  AWSMock.remock("DynamoDB", "putItem", (params, callback) => {
    mockerObservedExpirationTimeSentToAWS = params.Item.ExpirationTime.N;

    updateSpy2(params, null);
    callback(null, { pk: "foo", sk: "bar" }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = undefined;
  let dyLock = new lock("orion");
  await dyLock.obtainLock();

  assert.isTrue(
    updateSpy2.calledOnce,
    "test subject should have invoked the spy once, trying to modify DynamoDB Table"
  );

  let currentTime = new Date().getTime();
  expect(
    new Date(parseInt(mockerObservedExpirationTimeSentToAWS) * 1000).getTime()
  ).toBeGreaterThan(currentTime + 50 * 60 * 1000);
  expect(
    new Date(parseInt(mockerObservedExpirationTimeSentToAWS) * 1000).getTime()
  ).toBeLessThan(currentTime + 70 * 60 * 1000);
});

test("successful obtainLock Writes an expiration Time That is 30 minutes plus NOW when OVERRIDE is set", async () => {
  var mockerObservedExpirationTimeSentToAWS = "0";
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock("DynamoDB", "putItem", (params, callback) => {
    mockerObservedExpirationTimeSentToAWS = params.Item.ExpirationTime.N;

    updateSpy(params, null);
    callback(null, { pk: "foo", sk: "bar" }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = "" + 30 * 60 * 1000;
  let dyLock = new lock("orion");
  await dyLock.obtainLock();

  assert.isTrue(
    updateSpy.calledOnce,
    "test subject should have invoked the spy once, trying to modify DynamoDB Table"
  );

  let currentTime = new Date().getTime();
  expect(
    new Date(parseInt(mockerObservedExpirationTimeSentToAWS) * 1000).getTime()
  ).toBeGreaterThan(currentTime + 20 * 60 * 1000);
  expect(
    new Date(parseInt(mockerObservedExpirationTimeSentToAWS) * 1000).getTime()
  ).toBeLessThan(currentTime + 40 * 60 * 1000);
});

test("refreshLock Writes an expiration Time That is 1 hour plus NOW by default", async () => {
  var mockerObservedExpirationTimeSentToAWS = "0";
  const updateSpy2 = sinon.spy();

  //Set Mocker Behavior for this test
  //AWSMockp.remock
  AWSMock.remock("DynamoDB", "putItem", (params, callback) => {
    mockerObservedExpirationTimeSentToAWS = params.Item.ExpirationTime.N;

    updateSpy2(params, null);
    callback(null, { pk: "foo", sk: "bar" }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME = undefined;
  let dyLock = new lock("orion");
  await dyLock.obtainLock();
  await dyLock.refreshLock();

  assert.isTrue(
    updateSpy2.calledTwice,
    "test subject should have invoked the spy twice, trying to modify DynamoDB Table"
  );

  let currentTime = new Date().getTime();
  expect(
    new Date(parseInt(mockerObservedExpirationTimeSentToAWS) * 1000).getTime()
  ).toBeGreaterThan(currentTime + 50 * 60 * 1000);
  expect(
    new Date(parseInt(mockerObservedExpirationTimeSentToAWS) * 1000).getTime()
  ).toBeLessThan(currentTime + 70 * 60 * 1000);
});

test("releaseLock Writes to the Dynamo Lock Table", async () => {
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.remock("DynamoDB", "putItem", (params, callback) => {
    updateSpy(params, null);
    callback(null, { pk: "foo", sk: "bar" }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  let dyLock = new lock("orion");
  await dyLock.obtainLock();
  await dyLock.releaseLock();

  assert.isTrue(
    updateSpy.calledTwice,
    "test subject should have invoked the spy twice, trying to modify DynamoDB Table"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(sinon.match.has("TableName", "dynamo_locks")),
    "should have an arg with Expected Table Name Property"
  );
});
