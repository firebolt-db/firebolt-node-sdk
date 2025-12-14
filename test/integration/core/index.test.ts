import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("integration test", () => {
  it("works", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1");
    const { data, meta } = await statement.fetchResult();
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(1);
  });

  it("test connection", async () => {
    const firebolt = Firebolt();

    await firebolt.testConnection(connectionParams);
    expect(true).toBeTruthy();
  });

  it("requires engineEndpoint for Core connections", async () => {
    const firebolt = Firebolt();

    await expect(
      firebolt.connect({
        auth: FireboltCore(),
        database: process.env.FIREBOLT_DATABASE as string
        // Missing engineEndpoint
      })
    ).rejects.toThrow("engineEndpoint is required for Firebolt Core connections");
  });
});

