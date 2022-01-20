# Firebolt Node.js SDK

<img width="1114" alt="Screen Shot 2022-01-10 at 10 56 30 AM" src="https://user-images.githubusercontent.com/7674553/148823093-5ff07a44-9954-4640-b322-a7e029e47450.png">

## Installation

This library is published in the NPM registry and can be installed using any compatible package manager.

```sh
npm install firebolt-sdk --save

# For Yarn, use the command below.
yarn add firebolt-sdk
```


## Using the library

```typescript
import { Firebolt } from 'firebolt-sdk'

const firebolt = Firebolt();

const connection = await firebolt.connect({
  username: process.env.FIREBOLT_USERNAME,
  password: process.env.FIREBOLT_PASSWORD,
  database: process.env.FIREBOLT_DATABASE,
  engineName: process.env.FIREBOLT_ENGINE_NAME
});

const statement = await connection.execute("SELECT 1");

// fetch statement result
const { data, meta } = await statement.fetchResult();

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


```

## Contents
* <a href="#about">About</a>
* <a href="#documentation">Documentation</a>
* <a href="#usage">Usage</a>
  * <a href="#create-connection">Create connection</a>
    * <a href="#connectionoptions">ConnectionOptions</a>
  * <a href="#test-connection">Test connection</a>
  * <a href="#engine-url">Engine URL</a>
  * <a href="#execute-query">Execute query</a>
    * <a href="#executequeryoptions">ExecuteQueryOptions</a>
    * <a href="#querysettings">QuerySettings</a>
    * <a href="#responsesettings">ResponseSettings</a>
  * <a href="#fetch-result">Fetch result</a>
  * <a href="#stream-result">Stream result</a>
  * <a href="#result-hydration">Result hydration</a>
  * <a href="#engine-management">Engine management</a>
    * <a href="#getbyid">getById</a>
    * <a href="#getbyname">getByName</a>
    * <a href="#engine">Engine</a>
      * <a href="#start">start</a>
      * <a href="#stop">stop</a>
      * <a href="#restart">restart</a>
  * <a href="#database-management">Database management</a>
    * <a href="#database-getbyid">getById</a>
    * <a href="#database-getbyname">getByName</a>
    * <a href="#database">Database</a>
* <a href="#resource-manager">Resource Manager</a>
* <a href="#recipes">Recipes</a>
  * <a href="#streaming-results">Streaming results</a>
  * <a href="#custom-stream-transformers">Custom stream transformers</a>


<a id="About"></a>
## About
The Firebolt client for Node.js. firebolt-sdk provides common methods for quering Firebolt databases, fetching and streaming results, and engine management.

firebolt-sdk supports  Node.js `> v14`.

<a id="documentation"></a>
## Documentation

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
type ConnectionOptions = {
  username: string;
  password: string;
  database: string;
  engineName?: string;
  engineEndpoint?: string;
};
```

<a id="test-connection"></a>
### Test connection
TODO: write motivation
connection can be tested using:
```typescript
const firebolt = Firebolt();
await firebolt.testConnection(connectionOptions)
```
which will perform authentication and simple `select 1` query

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

<a id="executequeryoptions"></a>
### ExecuteQueryOptions

```typescript
export type ExecuteQueryOptions = {
  settings?: QuerySettings;
  response?: ResponseSettings;
};
```

<a id="querysettings"></a>
### QuerySettings

| Parameter     | Required | Default      | Description                       |
|---------------|----------|--------------|-----------------------------------|
| output_format |          | JSON_COMPACT | Specifies format of selected data |


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


<a id="engine-management"></a>
### Engine management

Engines can be managed by using the `resourceManager` object.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const enginesService = firebolt.resourceManager.engine
```

<a id="getbyid"></a>
#### getById

Returns engine using engine ID and account ID.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.engine.getById(
  "c8a228ea-93df-4784-99f9-a99368518782",
  "a32b073b-e093-4880-8fd4-3b302b4cf221"
);
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
| `id`                     | `{engine_id: string; account_id: string}` |       |
| `name`                   | `string`                                  |       |
| `endpoint`               | `string`                                  |       |
| `description`            | `string`                                  |       |
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

<a id="restart"></a>
##### Restart

Restarts an engine.

```typescript
import { Firebolt } from 'firebolt-sdk'

const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.engine.getByName("engine_name")
await engine.restart()
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

<a id="database-getbyid"></a>
#### Database getById

Returns database using engine ID and account ID.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
await firebolt.connect(connectionOptions);
const engine = await firebolt.resourceManager.database.getById(
  "c8a228ea-93df-4784-99f9-a99368518782",
  "a32b073b-e093-4880-8fd4-3b302b4cf221"
);
```

<a id="getbyname"></a>
#### Database getByName

Returns database using database name.

```typescript
import { Firebolt } from 'firebolt-sdk'
const firebolt = Firebolt();
const database = await firebolt.resourceManager.database.getByName("database_name")
```

<a id="database"></a>
#### Database

| Property      | Type                                      | Notes |
|---------------|-------------------------------------------|-------|
| `id`          | `{engine_id: string; account_id: string}` |       |
| `name`        | `string`                                  |       |
| `description` | `string`                                  |       |

<a id="resource-manager"></a>
## Resource Manager
It is possible to create `resourceManager` separately from firebolt client,
providing only auth credentials

```typescript
import { FireboltResourceManager } from 'firebolt-sdk'

const authOptions = {
  username: process.env.FIREBOLT_USERNAME as string,
  password: process.env.FIREBOLT_PASSWORD as string
};

const resourceManager = FireboltResourceManager();
await resourceManager.authenticate(authOptions);
const engine = await resourceManager.engine.getByName(
  process.env.FIREBOLT_ENGINE_NAME as string
);
```

<a id="recipes"></a>
## Recipes

<a id="streaming-results"></a>
### Streaming results

The recommended way to consume query results is by using streams.

For convenience, `statement.streamResult` also returns `meta: Promise<Meta[]>` and `statistics: Promise<Statistics>`, which are wrappers over `data.on('metadata')` and `data.on('statistics')`.

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
const statement = await connection.execute("select 1 union all select 2");

const { data } = await statement.streamResult();

serializedStream.pipe(serializedStream).pipe(process.stdout);
```

Or use `rowParser` that returns strings or Buffer:

```typescript
const { data } = await statement.streamResult({
  rowParser: (row: string) => `${row}\n`
});

data.pipe(process.stdout);
```

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
