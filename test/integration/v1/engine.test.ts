import { Firebolt, FireboltResourceManager } from "../../../src/index";
import { assignProtocol } from "../../../src/common/util";
import { EngineType, WarmupMethod } from "../../../src/service/engine/types";
import { DatabaseService } from "../../../src/service/database/v1";

const authOptions = {
  username: process.env.FIREBOLT_USERNAME as string,
  password: process.env.FIREBOLT_PASSWORD as string
};

const connectionOptions = {
  auth: authOptions,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(60000);

describe("engine integration", () => {
  it("starts engine", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const engine = await firebolt.resourceManager.engine.getByName(
      process.env.FIREBOLT_ENGINE_NAME as string
    );

    const {
      engine: { name }
    } = await engine.start();

    expect(name).toEqual(process.env.FIREBOLT_ENGINE_NAME);
  });

  it(
    "starts engine and waits for it to be ready",
    async () => {
      const firebolt = Firebolt({
        apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
      });

      await firebolt.connect(connectionOptions);

      const engine = await firebolt.resourceManager.engine.getByName(
        process.env.FIREBOLT_ENGINE_NAME as string
      );

      await engine.startAndWait();

      expect(engine.current_status_summary.includes("RUNNING")).toBe(true);
    },
    10 * 60 * 1000
  );
  it("resolve default engine endpoint if not provided", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      auth: {
        username: process.env.FIREBOLT_USERNAME as string,
        password: process.env.FIREBOLT_PASSWORD as string
      },
      database: process.env.FIREBOLT_DATABASE as string
    });

    expect(assignProtocol(connection.engineEndpoint)).toEqual(
      assignProtocol(process.env.FIREBOLT_ENGINE_ENDPOINT as string)
    );
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

  it("retrieves the engine endpoint", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const engine = await firebolt.resourceManager.engine.getByName(
      process.env.FIREBOLT_ENGINE_NAME as string
    );

    expect(typeof engine.endpoint).toEqual("string");
  });

  it("use separate firebolt resource client", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionOptions);
    const resourceManager = FireboltResourceManager({
      connection,
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const engine = await resourceManager.engine.getByName(
      process.env.FIREBOLT_ENGINE_NAME as string
    );
    expect(engine.name).toEqual(process.env.FIREBOLT_ENGINE_NAME);
  });

  it("creates and deletes an engine", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const engine_name = `${process.env.FIREBOLT_ENGINE_NAME}_create_test`;

    const engine = await firebolt.resourceManager.engine.create(engine_name, {
      region: "us-east-1",
      engine_type: EngineType.GENERAL_PURPOSE,
      scale: 1,
      auto_stop: 10,
      warmup: WarmupMethod.MINIMAL
    });

    expect(engine.name).toEqual(engine_name);

    await engine.delete();
  });

  it("attaches an engine to a database", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);
    const engineName = `${process.env.FIREBOLT_ENGINE_NAME}_attach_test`;

    const engine = await firebolt.resourceManager.engine.create(engineName, {
      region: "us-east-1"
    });

    try {
      await firebolt.resourceManager.engine.attachToDatabase(
        engine,
        process.env.FIREBOLT_DATABASE as string
      );

      const engines = await firebolt.resourceManager.engine.getByDB(
        process.env.FIREBOLT_DATABASE as string
      );

      expect(engines.filter(e => e.name == engineName)).toHaveLength(1);
    } finally {
      await engine.delete();
    }
  });
});
