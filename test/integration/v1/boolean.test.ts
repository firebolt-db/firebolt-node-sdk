import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(100000);

describe("boolean", () => {
  it("handles select boolean", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("select true::boolean", {
      settings: {
        advanced_mode: "true",
        bool_output_format: "postgres",
        output_format_firebolt_type_names: "true"
      }
    });

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("boolean");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(true);
  });
});
