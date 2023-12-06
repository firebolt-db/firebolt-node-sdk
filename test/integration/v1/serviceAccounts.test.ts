import { Firebolt } from "../../../src/index";

const connectionOptions = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

describe("service accounts auth", () => {
  it("retrieves a database by its name", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const { name } = await firebolt.resourceManager.database.getByName(
      process.env.FIREBOLT_DATABASE as string
    );

    expect(name).toEqual(process.env.FIREBOLT_DATABASE);
  });
  it.skip("queries engine", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionOptions);

    const statement = await connection.execute("SELECT 1");

    const { data } = await statement.fetchResult();
    const row = data[0];
    expect(row).toMatchInlineSnapshot();
  });
});
