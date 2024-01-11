import { Firebolt } from "../../../src/index";
import { assignProtocol } from "../../../src/common/util";
import { DatabaseModel } from "../../../src/service/database/v1/model";

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

  it("creates and deletes a database", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const database_name = `${
      process.env.FIREBOLT_DATABASE as string
    }_test_create`;

    const database = await firebolt.resourceManager.database.create(
      database_name,
      {
        description: "test description",
        region: "us-east-1"
      }
    );

    expect(database.name).toEqual(database_name);
    expect(database.description).toEqual("test description");
    expect(
      await firebolt.resourceManager.database.getByName(database.name)
    ).toBeTruthy();

    await database.delete();
    // We don't verify that the database doesn't exist anymore because
    // it takes a couple of seconds for backend to acknowledge the deletion
    // and sleeping approach would still be flaky.
  });

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

  it("retrieves a database by its name and id", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const database = await firebolt.resourceManager.database.getByName(
      process.env.FIREBOLT_DATABASE as string
    );

    expect(database.name).toEqual(process.env.FIREBOLT_DATABASE);
    const database_id = (database as DatabaseModel).id.database_id;

    const database2 = await firebolt.resourceManager.database.getById(
      database_id
    );
    expect(database2.name).toEqual(process.env.FIREBOLT_DATABASE);
  });
});
