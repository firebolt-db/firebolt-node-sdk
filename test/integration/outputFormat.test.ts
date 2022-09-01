import { Firebolt } from "../../src/index";
import { OutputFormat } from "../../src/types";

const connectionParams = {
  username: process.env.FIREBOLT_USERNAME as string,
  password: process.env.FIREBOLT_PASSWORD as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(50000);

describe("integration test", () => {
  it("works", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("select 1, 'a', 123.4", {
      settings: { output_format: OutputFormat.JSON_COMPACT_V3 }
    });
    const { data, meta } = await statement.fetchResult();
    console.log(data, meta);
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(1);
  });
});
