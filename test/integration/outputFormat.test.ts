import { Firebolt } from "../../src/index";
import { OutputFormat } from "../../src/types";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
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

    const statement = await connection.execute(
      "select 1, 'a', 123.4, 9223372036854775806, [1, 2, 4]",
      {
        settings: { output_format: OutputFormat.COMPACT }
      }
    );
    const { data, meta } = await statement.fetchResult();
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(5);
    const [int_type, text_type, double_type, long_type, array_type] = meta;
    expect(int_type.type).toEqual("int");
    expect(text_type.type).toEqual("text");
    expect(double_type.type).toEqual("double");
    expect(long_type.type).toEqual("long");
    expect(array_type.type).toEqual("array(int)");
  });
});
