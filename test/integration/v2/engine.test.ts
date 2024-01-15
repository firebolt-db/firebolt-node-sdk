import {
  EngineStatusSummary,
  Firebolt,
  FireboltResourceManager
} from "../../../src/index";
import { EngineType, WarmupMethod } from "../../../src/service/engine/types";

const authOptions = {
  client_id: process.env.FIREBOLT_CLIENT_ID as string,
  client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
};

const connectionOptions = {
  auth: authOptions,
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string
};

jest.setTimeout(60000);

describe("engine integration", () => {
  it.skip(
    "stops engine",
    async () => {
      const firebolt = Firebolt({
        apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
      });

      await firebolt.connect(connectionOptions);

      const engine = await firebolt.resourceManager.engine.getByName(
        process.env.FIREBOLT_ENGINE_NAME as string
      );

      expect(engine?.current_status_summary).toEqual(
        EngineStatusSummary.RUNNING
      );

      await engine.stop();

      expect(engine?.current_status_summary).toEqual(
        EngineStatusSummary.STOPPED
      );
    },
    10 * 60 * 1000
  );
  it.skip(
    "starts engine and waits for it to be ready",
    async () => {
      const firebolt = Firebolt({
        apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
      });

      await firebolt.connect(connectionOptions);

      const engine = await firebolt.resourceManager.engine.getByName(
        process.env.FIREBOLT_ENGINE_NAME as string
      );

      expect(engine?.current_status_summary).toEqual(
        EngineStatusSummary.STOPPED
      );

      await engine.startAndWait();

      expect(engine?.current_status_summary).toEqual(
        EngineStatusSummary.RUNNING
      );
    },
    10 * 60 * 1000
  );
  it("resolve default engine endpoint if not provided", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      auth: {
        client_id: process.env.FIREBOLT_CLIENT_ID as string,
        client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
      },
      account: process.env.FIREBOLT_ACCOUNT as string,
      database: process.env.FIREBOLT_DATABASE as string
    });

    expect(connection.engineEndpoint).not.toEqual(
      process.env.FIREBOLT_ENGINE_ENDPOINT // Should be system engine, not user
    );
  });
  it("create attach delete engine and database", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionOptions);
    const name = `${process.env.FIREBOLT_DATABASE}_create_delete`;

    const database = await firebolt.resourceManager.database.create(name, {
      description: "test database",
      fail_if_exists: true,
      region: "us-east-1"
    });
    expect(database.name == name);

    const engine = await firebolt.resourceManager.engine.create(name, {
      region: "us-east-1",
      engine_type: EngineType.GENERAL_PURPOSE,
      spec: "B2",
      scale: 1,
      auto_stop: 20 * 60,
      warmup: WarmupMethod.MINIMAL,
      fail_if_exists: true
    });
    expect(engine.name == name);

    await firebolt.resourceManager.engine.attachToDatabase(engine, database);
    const attached_engines = await database.getAttachedEngines();
    expect(attached_engines.includes(engine));

    await engine.delete();
    let query = `SELECT engine_name, url, status FROM information_schema.engines WHERE engine_name='${name}'`;
    let statement = await connection.execute(query);
    const { data: engine_data } = await statement.fetchResult();
    expect(engine_data.length == 0);

    await database.delete();
    query = `SELECT database_name, description FROM information_schema.databases WHERE database_name='${name}'`;
    statement = await connection.execute(query);
    const { data: database_data } = await statement.fetchResult();
    expect(database_data.length == 0);
  });
});

describe("engine resource manager", () => {
  it("retrieves all engines", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const engines = await firebolt.resourceManager.engine.getAll();

    expect(
      engines.find(engine => process.env.FIREBOLT_ENGINE_NAME === engine.name)
    ).toBeTruthy();
  });

  it("use separate firebolt resource client", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionOptions);
    const resourceManager = FireboltResourceManager({
      connection
    });
    const engine = await resourceManager.engine.getByName(
      process.env.FIREBOLT_ENGINE_NAME as string
    );
    expect(engine.name).toEqual(process.env.FIREBOLT_ENGINE_NAME);
  });
});
