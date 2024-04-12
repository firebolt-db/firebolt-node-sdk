import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT_V1 as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(100000);

describe("set statements execution", () => {
  it("set statements are executed correctly", async () => {
    const setQuery = "SET time_zone=America/New_York";
    const query =
      "SELECT '2023-01-05 17:04:42.123456 Europe/Berlin'::TIMESTAMPTZ;";

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    await connection.execute(setQuery);
    const statement = await connection.execute(query);

    const { data } = await statement.fetchResult();
    const expected = new Date("2023-01-05T11:04:42.123456-05:00");

    expect(data[0][0]).toEqual(expected);
  });
});
