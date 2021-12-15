# Firebolt nodejs sdk


## Installation

This library is published in the NPM registry and can be installed using any compatible package manager.

```sh
npm install firebolt-sdk --save

# For Yarn, use the command below.
yarn add firebolt-sdk
```


## Using the library

```typescript

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
* [About](#about)
* [Documentation](#documentation)
* [Usage](#usage)
  * [Firebolt client](#usage-firebolt-client)
  * [Create connection](#usage-create-connection)
    * [ConnectionOptions](#usage-create-connection-options)
  * [Test connection](#usage-test-connection)
  * [Engine endpoint](#usage-engine-endpoint)
  * [Execute query](#execute-query)
    * [ExecuteQueryOptions](#execute-query-options)
    * [QuerySettings](#execute-query-settings)
    * [ResponseSettings](#execute-query-response)
  * [Fetch result](#fetch-result)
  * [Stream result](#stream-result)
  * [Result hydration](#result-hydration)
  * [Engine management](#usage-engine-management)
* [Recipes](#recipes)
  * [Streaming results](#recipes-stream)
  * [Custom stream transformers](#recipes-stream-transform)


<a name="About"></a>
## About
A small text about the project

<a name="documentation"></a>
## Documentation

<a name="usage"></a>
## Usage

<a name="usage-firebolt-client"></a>
### Firebolt client

Firebolt client can be confirugred using custom apiEndpoint

```typescript
const firebolt = Firebolt({
  apiEndpoint: "api.dev.firebolt.io"
});
```

<a name="usage-create-connection"></a>
### Create connection

Instance of firebolt client can be used to create a connection

```typescript
const connection = await firebolt.connect(connectionOptions);
```

<a name="usage-create-connection-option"></a>
#### connectionOptions
where connectionOptions are:
```typescript
type ConnectionOptions = {
  username: string;
  password: string;
  database: string;
  engineName?: string;
  engineEndpoint?: string;
};
```


<a name="usage-create-connection"></a>
### Test connection
TODO: write motivation

<a name="usage-engine-endpoint"></a>
### Engine endpoint
Where to get engine endpoint in the ui?

<a name="execute-query"></a>
### Execute Query
In order to execute a query run:

```typescript
const statement = await connection.execute(query, executeQueryOptions);
```

where 
```typescript
query: string
executeQueryOptions?: ExecuteQueryOptions
```

<a name="execute-query-options"></a>
### ExecuteQueryOptions

```typescript
export type ExecuteQueryOptions = {
  settings?: QuerySettings;
  response?: ResponseSettings;
};
```

<a name="execute-query-settings"></a>
### ExecuteQuerySettings

TODO table

<a name="execute-query-response"></a>
### ResponseSettings

TODO table



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
