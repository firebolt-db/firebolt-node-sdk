import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(100000);

describe("boolean", () => {
  it("handles select boolean", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("select true::boolean");

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("boolean");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(true);
  });
});

