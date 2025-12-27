import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("error handling", () => {
  it("throws error for invalid SQL syntax", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await expect(connection.execute("INVALID SQL SYNTAX")).rejects.toThrow();
  });

  it("throws error for missing table", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.execute("SELECT * FROM nonexistent_table")
    ).rejects.toThrow();
  });

  it("throws error for invalid parameter count", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.execute("SELECT ?, ?", {
        parameters: [1]
      })
    ).rejects.toThrow();
  });

  it("throws error for division by zero", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await expect(connection.execute("SELECT 1 / 0")).rejects.toThrow();
  });

  it("throws error for invalid type cast", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.execute("SELECT 'not a number'::int")
    ).rejects.toThrow();
  });
});

