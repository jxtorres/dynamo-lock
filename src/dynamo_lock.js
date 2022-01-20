// @ts-check
var AWS = require("aws-sdk");
const {
    v1: uuidv1,
    v4: uuidv4
} = require("uuid");

class DynamoLock {
    static #dynamoDelegate = null;

    constructor(lockName){
        this.lockName = lockName;
        this.hasCheckedTTL = false;
        this.uuid = uuidv4();
        this.isHoldingLock = false;
    }

    static setDynamoDelegate(delegate){
        this.#dynamoDelegate = delegate;
    }

    async __ensureTableExistence(){

        // let DynamoDB = new AWS.DynamoDB();
        let DynamoDB = DynamoLock.#dynamoDelegate;


        var params = {
            TableName: 'dynamo_locks' /* required */
        };
        try{
            let data = await (DynamoDB.describeTable(params).promise());
            if(data.Table.ItemCount < 0)
                console.log("An Unexpected anomoly occurred with ensuring table existence for the dynamo locks.");

        } catch(error) {
            var updateParams = {
                TableName: 'dynamo_locks', /* required */
                BillingMode: "PAY_PER_REQUEST",
                AttributeDefinitions: [
                    {
                   AttributeName: "LockName", 
                   AttributeType: "S"
                  }, 
                    {
                   AttributeName: "ExpirationTime", 
                   AttributeType: "N"
                  },
                  {
                    AttributeName: "LockHolder", 
                    AttributeType: "S"
                   }
                 ], 
                 KeySchema: [
                    {
                   AttributeName: "LockName", 
                   KeyType: "HASH"
                  }
                 ]
            };
            await (DynamoDB.createTable(updateParams)).promise();
        }
        


    }

    async __ensureTTLSettings(){
        // let DynamoDB = new AWS.DynamoDB();
        let DynamoDB = DynamoLock.#dynamoDelegate;


        var params = {
            TableName: 'dynamo_locks' /* required */
        };
        let data = await (DynamoDB.describeTimeToLive(params).promise());
        if(data.TimeToLiveDescription.TimeToLiveStatus == "DISABLED"){
            var updateParams = {
                TableName: 'dynamo_locks', /* required */
                TimeToLiveSpecification: { /* required */
                    AttributeName: 'ExpirationTime', /* required */
                    Enabled: true /* required */
                }
            };
            await (DynamoDB.updateTimeToLive(updateParams)).promise();
        }
        this.hasCheckedTTL = true;

        

    }

    async obtainLock(){
        let dynamodb = DynamoLock.#dynamoDelegate;

        if(!this.hasCheckedTTL){
            await this.__ensureTableExistence();
            await this.__ensureTTLSettings();
        }



        let newItemExpiration = new Date();
        

        if(process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != undefined && 
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != 'undefined' &&
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != 'null' &&
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != null)
            newItemExpiration.setMinutes(new Date().getMinutes() + Math.ceil( parseInt(process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME)/(1000*60)  ));
        else
            newItemExpiration.setMinutes(new Date().getMinutes() + 60);


        var params = {
            Item: {
                "LockHolder": {
                S: this.uuid
                }, 
                "LockName": {
                S: "dynamo_lock_" + this.lockName
                },
                "ExpirationTime": {
                    N: Math.ceil(newItemExpiration.getTime()/1000) + ""
                }
            }, 
            TableName: 'dynamo_locks',
            ConditionExpression: 'attribute_not_exists(LockHolder) OR size(LockHolder) = 0'
            };
        //dynamodb.putItem(params);
        try{
            await dynamodb.putItem(params).promise();
            this.isHoldingLock = true;
            return true;
        } catch(error) {
            return false;
        }

    }



    async releaseLock(){
        let dynamodb = DynamoLock.#dynamoDelegate;

        let newItemExpiration = new Date();
        

        if(process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != undefined && 
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != 'undefined' &&
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != 'null' &&
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != null)
            newItemExpiration.setMinutes(new Date().getMinutes() + Math.ceil( parseInt(process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME)/(1000*60)  ));
        else
            newItemExpiration.setMinutes(new Date().getMinutes() + 60);


        var params = {
            Item: {
                "LockHolder": {
                S: ""
                }, 
                "LockName": {
                S: "dynamo_lock_" + this.lockName
                },
                "ExpirationTime": {
                    N: Math.ceil(newItemExpiration.getTime()/1000) + ""
                }
            }, 
            TableName: 'dynamo_locks',
            ConditionExpression: 'contains(LockHolder, ' + this.uuid  + ')'
            };
        //dynamodb.putItem(params);
        try{
            await dynamodb.putItem(params).promise();
            this.isHoldingLock = false;
            return true;
        } catch(error) {
            return false;
        }

    }




    async refreshLock(){
        let dynamodb = DynamoLock.#dynamoDelegate;


        let newItemExpiration = new Date();
        

        if(process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != undefined && 
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != 'undefined' &&
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != 'null' &&
            process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME != null)
            newItemExpiration.setMinutes(new Date().getMinutes() + Math.ceil( parseInt(process.env.DYNAMO_LOCK_OVERRIDE_EXPIRATION_TIME)/(1000*60)  ));
        else
            newItemExpiration.setMinutes(new Date().getMinutes() + 60);


        var params = {
            Item: {
                "LockHolder": {
                S: this.uuid
                }, 
                "LockName": {
                S: "dynamo_lock_" + this.lockName
                },
                "ExpirationTime": {
                    N: Math.ceil(newItemExpiration.getTime()/1000) + ""
                }
            }, 
            TableName: 'dynamo_locks',
            ConditionExpression: 'contains(LockHolder, ' + this.uuid  + ')'
            };
        //dynamodb.putItem(params);
        try{
            await dynamodb.putItem(params).promise();
            this.isHoldingLock = true;
            return true;
        } catch(error) {
            return false;
        }

    }


}

module.exports = DynamoLock;