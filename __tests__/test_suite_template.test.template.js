var { test, expect } = require("@jest/globals");
var lock = require("../index.js");
var AWSMock = require("aws-sdk-mock");
var AWS = require("aws-sdk");
var sinon = require("sinon");
var assert = require("chai").assert;
const { update } = require("lodash");

//Initial Override of AWS Agent to mock agent for class under test
AWSMock.setSDKInstance(AWS);
lock.setDynamoDelegate(new AWS.DynamoDB());

//Adjust Desired Test Defaults
jest.setTimeout(30000);

test("first test in suite mocking AWS Communication", async () => {
  return; //skip running this test

  //Initialize Spies and Mocker Observation Variables
  var mockerObservedExpirationTimeSentToAWS = "0";
  const updateSpy = sinon.spy();

  //Set Mocker Behavior for this test
  AWSMock.mock("DynamoDB", "putItem", (params, callback) => {
    console.log(
      "DynamoDB",
      "putItem",
      "mock called, caller object is under test"
    );

    //Record any observations with Mocker Observation Variables
    mockerObservedExpirationTimeSentToAWS = params.Item.ExpirationTime.N;

    updateSpy(params, null); //Pass All Params Passed to the mock to the spy, Spy will also accept a callback function to pass return values but we don't need it to do that.
    callback(null, { pk: "foo", sk: "bar" }); //Provide [Errors, Return Values] To Object That Calls AWS Mocker
  });
  lock.setDynamoDelegate(new AWS.DynamoDB());

  //Object under test
  let dyLock = new lock("orion");
  await dyLock.obtainLock();

  //Assertions and conclusions over the spy
  console.log(updateSpy.args); //Log all args passed to spy
  assert.isTrue(
    updateSpy.calledOnce,
    "test subject should have invoked the spy once, trying to modify DynamoDB Table"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(
      sinon.match.has("TableName", "dynamo_lock_" + "orion")
    ),
    "should have an arg with Expected Table Name Property"
  );
  assert.isTrue(
    updateSpy.calledWithMatch(
      sinon.match.has(
        "Item",
        sinon.match.has("AlbumTitle", sinon.match("S", ".*"))
      )
    ),
    "should have an item with some albumtitle structure, regexp"
  );

  //Assertions and conclusions over the Mocker Variables
  let currentTime = new Date().getTime();
  expect(
    new Date(parseInt(mockerObservedExpirationTimeSentToAWS) * 1000).getTime()
  ).toBeGreaterThan(currentTime + 50 * 60 * 1000);
  expect(
    new Date(parseInt(mockerObservedExpirationTimeSentToAWS) * 1000).getTime()
  ).toBeLessThan(currentTime + 70 * 60 * 1000);
});
