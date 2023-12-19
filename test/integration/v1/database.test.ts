import { Firebolt } from "../../../src/index";
import { assignProtocol } from "../../../src/common/util";

const connectionOptions = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(20000);

describe("database integration", () => {
  it("retrieves default url", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const database = await firebolt.resourceManager.database.getByName(
      process.env.FIREBOLT_DATABASE as string
    );

    const defaultUrl = await database.getDefaultEndpoint();

    expect(assignProtocol(defaultUrl)).toEqual(
      assignProtocol(process.env.FIREBOLT_ENGINE_ENDPOINT as string)
    );
  });
});

describe("engine resource manager", () => {
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
