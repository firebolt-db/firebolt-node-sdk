# Firebolt Node.js SDK

<img width="1114" alt="Screen Shot 2022-01-10 at 10 56 30 AM" src="https://user-images.githubusercontent.com/7674553/148823093-5ff07a44-9954-4640-b322-a7e029e47450.png">

This guide explains how to install, configure, and use the Firebolt Node.js SDK to connect to a Firebolt database from a Node.js application. You can use this SDK to programmatically connect to a Firebolt database, run queries, and manage database resources.

## Installation

The Firebolt Node.js SDK is published on the [NPM registry](https://www.npmjs.com/package/@firebolt-js/sdk). Installing the SDK integrates Firebolt functionality into your application, allowing you to perform database operations and manage resources programmatically.

To install using npm, run the following command:

```sh
npm install firebolt-sdk --save
```

To install using Yarn, run the following command:
```sh
yarn add firebolt-sdk
```

### Authentication

After installation, you must authenticate before you can use the SDK to establish connections, run queries, and manage database resources. The following code example sets up a connection using your Firebolt service account credentials:

```typescript
const connection = await firebolt.connect({
  auth: {
    client_id: '12345678-90123-4567-8901-234567890123',
    client_secret: 'secret',
  },
  engineName: 'engine_name',
  account: 'account_name',
  database: 'database',
});
```
In the previous code example, the following apply:

* `client_id` and `client_secret` are your service account credentials. Follow the Firebolt's [guide](https://docs.firebolt.io/Guides/managing-your-organization/service-accounts.html#create-a-service-account) on how to create one and get its id and secret.
* `engineName` is the name of the engine which you want to run your queries on.
* `database` is the target databaset to store your tables.
* `account` is the [account](https://docs.firebolt.io/Overview/organizations-accounts.html#accounts) within your organisation. Your account is not the same as your user name.

### Example

In the following code example, credentials are stored in environment variables. For bash and similar shells you can set them by running `export FIREBOLT_CLIENT_ID=<your_client_id>` where <your_client_id> is the id you want to set. This method prevents hardcoding sensitive information in your code so it can be safely commited to a version control system such as Git. Many IDEs, including IntelliJ IDEA, allow the configuration of environment variables in their run configurations.

```typescript
import { Firebolt } from 'firebolt-sdk'

const firebolt = Firebolt();

const connection = await firebolt.connect({
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET,
  },
  account: process.env.FIREBOLT_ACCOUNT,
  database: process.env.FIREBOLT_DATABASE,
  engineName: process.env.FIREBOLT_ENGINE_NAME
});

// Create table
await connection.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INT,
    name STRING,
    age INT
  )
`);

// Insert sample data
await connection.execute(`
  INSERT INTO users (id, name, age) VALUES
  (1, 'Alice', 30),
  (2, 'Bob', 25)
`);

// Update some rows
await connection.execute(`
  UPDATE users SET age = 31 WHERE id = 1
`);

// Fetch data
const statement = await connection.execute("SELECT * FROM users");

// fetch statement result
const { data, meta } = await statement.fetchResult();

console.log(meta)
// Outputs:
// [
//   Meta { type: 'int null', name: 'id' },
//   Meta { type: 'text null', name: 'name' },
//   Meta { type: 'int null', name: 'age' }
// ]

// or stream result
const { data } = await statement.streamResult();

data.on("metadata", metadata => {
  console.log(metadata);
});

data.on("error", error => {
  console.log(error);
});

const rows = []

for await (const row of data) {
  rows.push(row);
}

console.log(rows)
// Outputs:
// [ [ 1, 'Alice', 31 ], [ 2, 'Bob', 25 ] ]


```

## Contents
* <a href="#about">About</a>
* <a href="#documentation">Documentation</a>
* <a href="#usage">Usage</a>
  * <a href="#create-connection">Create connection</a>
    * <a href="#connectionoptions">ConnectionOptions</a>
    * <a href="#accesstoken">AccessToken</a>
    * <a href="#clientcredentials">Client credentials</a>
    * <a href="#enginename">engineName</a>
  * <a href="#test-connection">Test connection</a>
  * <a href="#engine-url">Engine URL</a>
  * <a href="#execute-query">Execute query</a>
    * <a href="#executequeryoptions">ExecuteQueryOptions</a>
    * <a href="#parameters">parameters</a>
    * <a href="#named-parameters">Named parameters</a>
    * <a href="#querysettings">QuerySettings</a>
    * <a href="#responsesettings">ResponseSettings</a>
  * <a href="#fetch-result">Fetch result</a>
  * <a href="#stream-result">Stream result</a>
  * <a href="#result-hydration">Result hydration</a>
  * <a href="#server-side-async-query-execution">Server-side async queries</a>
    * <a href="#execute-async-query">Execute Async Query</a>
    * <a href="#check-async-query-status">Check Async Query Status</a>
    * <a href="#cancel-async-query">Cancel Async Query</a>
  * <a href="#engine-management">Engine management</a>
    * <a href="#getbyname">getByName</a>
    * <a href="#engine">Engine</a>
      * <a href="#start">start</a>
      * <a href="#stop">stop</a>
  * <a href="#database-management">Database management</a>
    * <a href="#database-getbyname">getByName</a>
    * <a href="#database">Database</a>
* <a href="#recipes">Recipes</a>
  * <a href="#streaming-results">Streaming results</a>
  * <a href="#custom-stream-transformers">Custom stream transformers</a>
* <a href="#special-considerations">Special Considerations</a>

<a id="About"></a>
## About
The Firebolt client for Node.js. firebolt-sdk provides common methods for quering Firebolt databases, fetching and streaming results, and engine management.

firebolt-sdk supports  Node.js `> v16`.

<a id="documentation"></a>
## Documentation
[Firebolt's Node.js documentation](https://docs.firebolt.io/Guides/developing-with-firebolt/connecting-with-nodejs.html)
<a id="usage"></a>
## Usage

<a id="create-connection"></a>
### Create connection

```typescript
const connection = await firebolt.connect(connectionOptions);
```

<a id="connectionoptions"></a>
#### ConnectionOptions
```typescript
type AccessTokenAuth = {
  accessToken: string;
};

type ClientCredentialsAuth = {
  client_id: string;
  client_secret: string;
};

type ConnectionOptions = {
  auth: AccessTokenAuth | ServiceAccountAuth;
  database: string;
  engineName?: string;
  engineEndpoint?: string;
  account?: string;
};
```


<a id="enginename"></a>
#### engineName
You can omit `engineName` and execute AQL queries on such connection.

<a id="accesstoken"></a>
#### AccessToken
Instead of passing client id/secret  directly,
you can also manage authentication outside of node sdk
and pass accessToken when creating the connection

```typescript
const connection = await firebolt.connect({
  auth: {
    accessToken: "access_token",
  },
  engineName: 'engine_name',
  account: 'account_name',
  database: 'database',
});
```

<a id="clientcredentials"></a>
#### Client credentials
Use client credentials to authenticate as follows:

```typescript
const connection = await firebolt.connect({
  auth: {
    client_id: 'b1c4918c-e07e-4ab2-868b-9ae84f208d26',
    client_secret: 'secret',
  },
  engineName: 'engine_name',
  account: 'account_name',
  database: 'database',
});
```

<a id="token-caching"></a>
#### Token caching
Driver implements a caching mechanism for access tokens. If you are using the same client id or secret for multiple connections, the driver will cache the access token and reuse it for subsequent connections.
This behavior can be disabled by setting `useCache` to `false` in the connection options.
```typescript
const connection = await firebolt.connect({
  auth: {
    client_id: 'b1c4918c-e07e-4ab2-868b-9ae84f208d26',
    client_secret: 'secret',
  },
  engineName: 'engine_name',
  account: 'account_name',
  database: 'database',
  useCache: false
});
```


<a id="test-connection"></a>
### Test connection
Test the connection using the following example script:
```typescript
const firebolt = Firebolt();
await firebolt.testConnection(connectionOptions)
```
which will perform authentication and a simple `select 1` query

<a id="engine-url"></a>
### Engine URL
Firebolt engine URLs use the following format:

```
<engine-name>.<account-name>.<region>.app.firebolt.io
```

For example: `your-engine.your-account.us-east-1.app.firebolt.io`. You can find and copy your engine endpoint name in the Firebolt web UI.

<a id="execute-query"></a>
### Execute Query

```typescript
const statement = await connection.execute(query, executeQueryOptions);
```

### Execute Query with set flags

```typescript
const statement = await connection.execute(query, {
  settings: { query_id: 'hello' }
});
```

<a id="executequeryoptions"></a>
### ExecuteQueryOptions

```typescript
export type ExecuteQueryOptions = {
  parameters:? unknown[];
  settings?: QuerySettings;
  response?: ResponseSettings;
};
```

<a id="parameters"></a>
### parameters
The `parameters` field is used to specify replacements for `?` symbol in the query as follows:

For example: 
```typescript
const statement = await connection.execute("select ?, ?", {
  parameters: ["foo", 1]
});
```

The previous query produces: `select 'foo', 1` query

Format `Tuple`:

```typescript
import { Tuple } from 'firebolt-sdk'

const statement = await connection.execute("select ? where bar in ?", {
  parameters: [
    1,
    new Tuple(['foo'])
  ]
});
```

<a id="named-parameters"></a>
### Named parameters
The `namedParameters` field is used to specify replacements for `:name` tokens in the query.

For example: 
```typescript
const statement = await connection.execute("select :foo, :bar", {
  namedParameters: { foo: "foo", bar: 123 }
});
```

The previous query will produce: `select 'foo', 123` query

<a id="querysettings"></a>
### QuerySettings

| Parameter     | Required | Default      | Description                       |
|---------------|----------|--------------|-----------------------------------|
| output_format |          | JSON_COMPACT | Specifies format of selected data |

You can also use `QuerySettings` to specify set flags.
For example: `{ query_id: 'hello' }`


<a id="executequeryresponse"></a>
### ResponseSettings

| Parameter         | Required | Default | Description                                           |
|-------------------|----------|---------|-------------------------------------------------------|
| normalizeData     |          | false   | Maps each row in response from array format to object |
| bigNumberAsString |          | false   | Hydrate BigNumber as String                           |


<a id="fetch-result"></a>
### Fetch result

```typescript
const { data, meta, statistics } = await statement.fetchResult();
```

The Promise API **is not recommended** for `SELECT` queries with large result sets (greater than 10,000 rows). This is because it parses results synchronously, so will block the JS thread/event loop and may lead to memory leaks due to peak GC loads.

It is recommended to use `LIMIT` in your queries when using the Promise API.

<a id="stream-result"></a>
### Stream result

```typescript
const { data } = await statement.streamResult();
const rows: unknown[] = [];

data.on("metadata", metadata => {
  console.log(metadata);
});

data.on("error", error => {
  console.log(error);
});

for await (const row of data) {
  rows.push(row);
}
```

<a id="result-hydration"></a>
### Result hydration

firebolt-sdk maps SQL data types to their corresponding JavaScript equivalents. The mapping is described in the table below:

| Category    | SQL type | JavaScript type | Notes                                                                                                                             |
|-------------|----------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Numeric     | INT      | Number          | If value cannot be represented by JavaScript Number (determine using Number.isSafeInteger), BigNumber from "bignumber.js" is used |
|             | INTEGER  | Number          |                                                                                                                                   |
|             | BIGINT   | Number          |                                                                                                                                   |
|             | LONG     | Number          |                                                                                                                                   |
|             | FLOAT    | Number          |                                                                                                                                   |
|             | DOUBLE   | Number          |                                                                                                                                   |
| String      | VARCHAR  | String          |                                                                                                                                   |
|             | TEXT     | String          |                                                                                                                                   |
|             | STRING   | String          |                                                                                                                                   |
| Date & Time | DATE     | Date            |                                                                                                                                   |

<a id="Server-side async queries"></a>
## Server-side async query execution

Firebolt supports server-side asynchronous query execution. This feature allows you to run
queries in the background and fetch the results later. This is especially useful for long-running
queries that you don't want to wait for or maintain a persistent connection to the server.

<a id="Execute Async Query"></a>
### Execute Async Query

Executes a query asynchronously. This is useful for long-running queries that you don't want to block the main thread. The resulting statement does not contain data and should only be used to receive an async query token. Token can be saved elsewhere and reused, even on a new connection to check on this query.

```typescript
const statement = await connection.executeAsync(query, executeQueryOptions);
const token = statement.asyncQueryToken; // used to check query status and cancel it
// statement.fetchResult() -- not allowed as there's no result to fetch
```

<a id="Check Async Query Status"></a>
### Check Async Query Status

Checks the status of an asynchronous query. Use this to determine if the query is still running or has completed. `isAsyncQueryRunning` woudl return true or false if the query is running or has finished. `isAsyncQuerySuccessful` would return true if the query has completed successfully, false if it has failed and `undefined` if the query is still running.

```typescript
const token = statement.asyncQueryToken; // can only be fetched for async query
const isRunning = await connection.isAsyncQueryRunning(token);
const isSuccessful = await connection.isAsyncQuerySuccessful(token);
```

<a id="Cancel Async Query"></a>
### Cancel Async Query

Cancels a running asynchronous query. Use this if you need to stop a long-running query, if its execution is no longer needed.

```typescript
const token = statement.asyncQueryToken; // can only be fetched for async query
await connection.cancelAsyncQuery(token);
```

<a id="engine-management"></a>
### Engine management

Engines can be managed by using the `resourceManager` object.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const enginesService = firebolt.resourceManager.engine
```

<a id="getbyname"></a>
#### getByName

Returns engine using engine name.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.engine.getByName("engine_name")
```

<a id="engine"></a>
#### Engine

| Property                 | Type                                      | Notes |
|--------------------------|-------------------------------------------|-------|
| `name`                   | `string`                                  |       |
| `endpoint`               | `string`                                  |       |
| `current_status_summary` | `string`                                  |       |

<a id="start"></a>
##### Start

Starts an engine.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.engine.getByName("engine_name")
await engine.start()
```

<a id="stop"></a>
##### Stop

Stops an engine.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.engine.getByName("engine_name")
await engine.stop()
```

<a id="create-engine"></a>
##### Engine create

Creates an engine.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.engine.create("engine_name");
```

<a id="attach-to-database"></a>
##### Attach to database

Attaches an engine to a database.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.engine.attachToDatabase("engine_name", "database_name");
```

<a id="delete-engine"></a>
##### Engine delete

Deletes an engine.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.engine.getByName("engine_name");
await engine.delete();
```

<a id="database-management"></a>
### Database management

Databases can be managed by using the `resourceManager` object.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const databaseService = firebolt.resourceManager.database
```

<a id="getbyname"></a>
#### Database getByName

Returns database using database name.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const database = await firebolt.resourceManager.database.getByName("database_name")
```

<a id="database"></a>
#### Database

| Property      | Type                                      | Notes |
|---------------|-------------------------------------------|-------|
| `name`        | `string`                                  |       |
| `description` | `string`                                  |       |


<a id="create-database"></a>
##### Database create

Creates a database.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const database = await firebolt.resourceManager.database.create("database_name");
```

<a id="get-attached-engines"></a>
##### Get attached engines

Get engines attached to a database.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const database = await firebolt.resourceManager.database.getByName("database_name");
const engines = database.getAttachedEngines();
```

<a id="delete-database"></a>
##### Database delete

Deletes a database.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const database = await firebolt.resourceManager.database.getByName("database_name");
await database.delete();
```

<a id="recipes"></a>
## Recipes

<a id="streaming-results"></a>
### Streaming results

Streaming can only be used with the `executeStream` method.
The streamResult method for the normal `execute` method returns an in-memory stream of result, rather than dynamically fetching them from the response. This is further explained in the [in-memory stream](#in-memory-stream) section.

The recommended way to consume query results is by using streams with standard events: 
* `data.on('meta')`
* `data.on('data')`
* `data.on('end')`
* `data.on('error')`

```typescript
const firebolt = Firebolt();

const connection = await firebolt.connect(connectionParams);

const statement = await connection.executeStream("SELECT 1");

const { data } = await statement.streamResult();

const rows: unknown[] = [];

const meta = await stream.once(data, "meta");

data.on("data", data => {;
  rows.push(data);
});

console.log(meta);
console.log(rows)
```
In case an errors occurs before streaming, or during the first packet, the error will be thrown by the executeStream method. If the error occurs during streaming, it will be emitted by the stream.
```typescript
try {
  await connection.executeStream("select *1;");
} catch (error) {
  //error is thrown directly since this is a syntax error
}

const statement = await connection.executeStream(
  "select 1/(i-100000) as a from generate_series(1,100000) as i"
);
const { data } = await statement.streamResult();

data.on("error", error => {
  //error is emitted by the stream after first chunk of results
  console.log(error); 
});

```


<a id="custom-stream-transformers"></a>
### Custom stream transformers

To achieve seamless stream pipes to `fs` or `stdout`, you can use the `Transform` stream.

```typescript
import stream,  { TransformCallback } from 'stream';

class SerializeRowStream extends stream.Transform {
  public constructor() {
    super({
      objectMode: true,
      transform(
        row: any,
        encoding: BufferEncoding,
        callback: TransformCallback
      ) {
        const transformed = JSON.stringify(row);
        this.push(transformed);
        this.push('\n')
        callback();
      }
    });
  }
}

const serializedStream = new SerializeRowStream()

const firebolt = Firebolt();
const connection = await firebolt.connect(connectionParams);
const statement = await connection.executeStream("select * from generate_series(1, 1000)");

const { data } = await statement.streamResult();


data.pipe(serializedStream).pipe(process.stdout);
```

<a id="in-memory-stream"></a>
### In-memory stream

When using the streamResult method on the object returned from a simple execute method, the driver will return
an in-memory stream of the result. This is useful for small result sets, but not recommended for large result sets.

In this case the whole result will be first fetched in memory and then made available via streamResult. 
This is done for compatibility reasons and has no performance benefits compared to using fetchResult

```typescript
const firebolt = Firebolt();

const connection = await firebolt.connect(connectionParams);

const statement = await connection.execute("SELECT 1");

const {
  data,
  meta: metaPromise,
  statistics: statisticsPromise
} = await statement.streamResult();

const rows: unknown[] = [];

const meta = await metaPromise;

for await (const row of data) {
  rows.push(row);
}

const statistics = await statisticsPromise

console.log(meta);
console.log(statistics);
console.log(rows)
```

<a id="special-considerations"></a>
## Special Considerations

When using the Firebolt Node.js SDK, keep the following considerations in mind:

- **Avoid blocking the event loop**: Node.js runs JavaScript code on a single-threaded event loop. Blocking operations can degrade performance and responsiveness and may lead to networking errors. For more details, see [Don't Block the Event Loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop).
- **Streaming large result sets**: Use the `streamResult` method instead of `fetchResult` for large datasets to avoid memory issues.
- **Environment variables**: Always store sensitive credentials (like `client_id` and `client_secret`) in environment variables rather than hardcoding them in your source code.

## Development process
### Actions before
### Setup env variables

  ```sh
  cp .env.example .env
  ```
  
## Execute tests

  ```sh
    npm test
  ```

## License

Released under [Apache License](./LICENSE).
