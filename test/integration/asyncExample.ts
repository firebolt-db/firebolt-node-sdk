import { Firebolt } from "firebolt-sdk";

const connectionParams = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

const main = async () => {
  const queries = ["SELECT 1", "SELECT 2", "SELECT 3"];

  const clients = 300;
  const resultPromises = [];

  const firebolt = Firebolt({
    apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
  });

  const connection = await firebolt.connect(connectionParams);

  const executeQuery = async (query: string) => {
    const statement = await connection.execute(query);
    const { data, statistics } = await statement.fetchResult();
    console.log(
      `Query: ${query} returned with: ${data} in ${statistics.duration}`
    );
    return data;
  };

  for (let i = 0; i < clients; i++) {
    const query = queries[i % queries.length];
    resultPromises.push(executeQuery(query));
  }

  const results = await Promise.all(resultPromises);
  return results;
};

main()
  .then(results => {
    console.log(results);
  })
  .catch(error => {
    console.log(error);
  });
