import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("async queries", () => {
  it("throws error when attempting async query execution", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.executeAsync("SELECT 1", { settings: { async: true } })
    ).rejects.toThrow("Async queries are not supported in Firebolt Core");
  });

  it("throws error when checking async query status", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.isAsyncQueryRunning("dummy-token")
    ).rejects.toThrow("Async queries are not supported in Firebolt Core");
  });

  it("throws error when checking async query success", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.isAsyncQuerySuccessful("dummy-token")
    ).rejects.toThrow("Async queries are not supported in Firebolt Core");
  });

  it("throws error when canceling async query", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.cancelAsyncQuery("dummy-token")
    ).rejects.toThrow("Async queries are not supported in Firebolt Core");
  });
});

