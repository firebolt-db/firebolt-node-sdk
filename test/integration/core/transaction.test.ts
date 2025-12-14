import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("transactions", () => {
  it("begin throws error", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    await expect(connection.begin()).rejects.toThrow(
      "Transactions are not supported in Firebolt Core"
    );
  });

  it("commit throws error", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    await expect(connection.commit()).rejects.toThrow(
      "Transactions are not supported in Firebolt Core"
    );
  });

  it("rollback throws error", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    await expect(connection.rollback()).rejects.toThrow(
      "Transactions are not supported in Firebolt Core"
    );
  });
});

