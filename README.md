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

const firebolt = Firebolt({
  apiEndpoint: process.env.FIREBOLT_API_ENDPOINT
});

const connection = await firebolt.connect({
  username: process.env.FIREBOLT_USERNAME,
  password: process.env.FIREBOLT_PASSWORD,
  database: process.env.FIREBOLT_DATABASE,
  engineName: process.env.FIREBOLT_ENGINE_NAME
});

const statement = await connection.execute("SELECT 1");

// fetch statement result
const { data, meta } = await statement.fetchResult();

```

## Contents
* [About](#about)
* [Documentation](#documentation)
* [Usage](#usage)
  * [Firebolt client](#useage-firebolt-client)
  * [Create connection](#usage-create-connection)
  * [Test connection](#usage-test-connection)
  * [Engine Endpoint](#usage-engine-endpoint)
  * [Executing Query](#execute-query)
    * [QuerySettings](#execute-query-settings)
    * [ResponseSettings](#execute-query-response)
  * [Fetch results](#fetch-results)
  * [Stream results](#stream-results)
  * [Engine management](#usage-engine-management)
* [Recipes](#recipes)
  * [Streaming results](#recipes-stream)
  * [Custom stream transformers](#recipes-stream-transform)



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
