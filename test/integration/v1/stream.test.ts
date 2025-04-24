import { Firebolt } from "../../../src";

const connectionParams = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(20000);

describe("streams", () => {
  it("stream transformers", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    expect(() =>
      connection.executeStream(
        `select 1 from generate_series(1, 250000000)` //~1 GB response
      )
    ).rejects.toThrow(
      Error("Stream execution is not supported in this Firebolt version.")
    );
  });
});
