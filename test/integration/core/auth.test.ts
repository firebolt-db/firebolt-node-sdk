import { Firebolt, FireboltCore } from "../../../src/index";

const connectionOptions = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("auth", () => {
  it("connects to Firebolt Core without authentication", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionOptions);

    // Test that we can execute a simple query
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    expect(data[0][0]).toEqual(1);
  });
});

