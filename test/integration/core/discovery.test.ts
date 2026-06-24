import { Firebolt } from "../../../src/index";
import { ConnectionOptions } from "../../../src/types";

const fireboltHost =
  process.env.FIREBOLT_HOST ||
  process.env.FIREBOLT_CORE_ENDPOINT ||
  "http://127.0.0.1:3473";

const connectionParams: ConnectionOptions = {
  host: fireboltHost,
  database: process.env.FIREBOLT_DATABASE as string,
  ssl_mode: "disable"
};

jest.setTimeout(20000);

describe("discovery integration test", () => {
  it("connects through the discovery endpoint", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1");
    const { data, meta } = await statement.fetchResult();
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(1);
  });

  it("test connection uses the discovery endpoint", async () => {
    const firebolt = Firebolt();

    await firebolt.testConnection(connectionParams);
    expect(true).toBeTruthy();
  });
});
