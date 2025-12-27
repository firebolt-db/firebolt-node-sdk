import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(100000);

describe("geography", () => {
  it("handles select geo", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "select 'POINT(1 1)'::geography;"
    );

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("geography");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual("0101000020E6100000FEFFFFFFFFFFEF3F000000000000F03F");
  });
});
