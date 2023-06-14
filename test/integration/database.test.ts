import { Firebolt } from "../../src/index";

const connectionOptions = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string
};

jest.setTimeout(20000);

describe("database resource manager", () => {
  it("retrieves all databases", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const databases = await firebolt.resourceManager.database.getAll();

    expect(
      databases.find(
        database => process.env.FIREBOLT_DATABASE === database.name
      )
    ).toBeTruthy();
  });

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
});
