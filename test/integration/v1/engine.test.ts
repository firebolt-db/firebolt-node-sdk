import { Firebolt, FireboltResourceManager } from "../../../src/index";

const authOptions = {
  username: process.env.FIREBOLT_USERNAME as string,
  password: process.env.FIREBOLT_PASSWORD as string
};

const connectionOptions = {
  auth: authOptions,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(20000);

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

    expect(connection.engineEndpoint).toEqual(
      process.env.FIREBOLT_ENGINE_ENDPOINT
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

  it("retrieves the engine description", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const engine = await firebolt.resourceManager.engine.getByName(
      process.env.FIREBOLT_ENGINE_NAME as string
    );

    expect(typeof engine.description).toEqual("string");
  });

  it("use separate firebolt resource client", async () => {
    const resourceManager = FireboltResourceManager({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    await resourceManager.authenticate({ auth: authOptions });
    const engine = await resourceManager.engine.getByName(
      process.env.FIREBOLT_ENGINE_NAME as string
    );
    expect(engine.name).toEqual(process.env.FIREBOLT_ENGINE_NAME);
  });
});
