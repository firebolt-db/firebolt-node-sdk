import { Firebolt } from "../../src/index";

const auth = {
  client_id: process.env.FIREBOLT_CLIENT_ID as string,
  client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
};

const connectionOptions = {
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string,
  account: process.env.FIREBOLT_ACCOUNT as string
};

jest.setTimeout(20000);

describe("auth", () => {
  it("support new auth connection options", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect({
      ...connectionOptions,
      auth
    });
  });
});
