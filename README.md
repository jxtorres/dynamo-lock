# dynamo-lock

A concurreny Locking mechanism for shared resources that is implemented with a DynamoDB Provider.

# INSTALLATION

On Terminal:

**npm install @jxtorres/dynamo-lock**

In Source Files:

```
// Import Libraries
var dynamoLock = require("@jxtorres/dynamo-lock")
var AWS = require("aws-sdk");

//set AWS Config if not already in the env properties
// process.env.AWS_ACCESS_KEY_ID = "XXXXXXXXX"
// process.env.AWS_SECRET_ACCESS_KEY = "XXXXXXXX"
// process.env.AWS_DEFAULT_REGION = "XXXXXXXX";

// Set the DynamoDB Delegate that the lock will use.
dynamoLock.setDynamoDelegate(new AWS.DynamoDB());

//Create Lock Instance
var writeLock = new dynamoLock("SharedResourceName");

//Acquire Lock
let hasLockBeenAcquired = await writeLock.obtainLock();

// ....DO STUFF..

//Release Lock
await writeLock.releaseLock();
```
