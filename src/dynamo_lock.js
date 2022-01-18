// @ts-check

class DynamoLock {
    static #dynamoDelegate = null;

    constructor(lockName){
        this.lockName = lockName;
    }

    static setDynamoDelegate(delegate){
        this.#dynamoDelegate = delegate;
    }

    async obtainLock(){
        let dynamodb = DynamoLock.#dynamoDelegate;

        // TODO ITEMS
        // ...ENSURE THE TABLE EXISTS,,,
        // ....ENSURE TTL IS SET
        // var params = {
        //     TableName: 'STRING_VALUE', /* required */
        //     TimeToLiveSpecification: { /* required */
        //       AttributeName: 'STRING_VALUE', /* required */
        //       Enabled: true || false /* required */
        //     }
        //   };
        //   dynamodb.updateTimeToLive(params

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
                "AlbumTitle": {
                S: "Somewhat Famous"
                }, 
                "LockName": {
                S: "dynamo_lock_" + this.lockName
                }, 
                "SongTitle": {
                S: "Call Me Today"
                },
                "ExpirationTime": {
                    N: Math.ceil(newItemExpiration.getTime()/1000) + ""
                }
            }, 
            ReturnConsumedCapacity: "TOTAL", 
            TableName: 'dynamo_locks'
            };
            //dynamodb.putItem(params);
            await dynamodb.putItem(params).promise();

    }


}

module.exports = DynamoLock;