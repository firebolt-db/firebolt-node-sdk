import { Firebolt } from "../../src/index";

const connectionOptions = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string,
  account: process.env.FIREBOLT_ACCOUNT as string
};

jest.setTimeout(20000);

describe("account integration", () => {
  it("retrieves default url", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);
  });
});
