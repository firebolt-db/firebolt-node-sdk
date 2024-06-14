import { setupServer } from "msw/node";
import { rest } from "msw";
import { Logger } from "../../../src/logger/node";
import { QUERY_URL } from "../../../src/common/api";
import { Firebolt, QueryFormatter } from "../../../src";
import { ResourceManager } from "../../../src/service";
import { ConnectionError, DeprecationError } from "../../../src/common/errors";
import { NodeHttpClient } from "../../../src/http/node";
import { Authenticator } from "../../../src/auth";
import {
  processEngineStatus,
  EngineStatusSummary
} from "../../../src/service/engine/types";
import { inMemoryCache } from "../../../src/common/tokenCache";

const apiEndpoint = "api.fake.firebolt.io";

export const selectEngineResponse = {
  meta: [
    {
      name: "engine_name",
      type: "text"
    },
    {
      name: "url",
      type: "text"
    },
    {
      name: "status",
      type: "text"
    }
  ],
  data: [["some_engine", "https://some_engine.com", "Running"]],
  rows: 1
};

export const selectEnginesResponse = {
  meta: [
    {
      name: "engine_name",
      type: "text"
    },
    {
      name: "url",
      type: "text"
    },
    {
      name: "status",
      type: "text"
    }
  ],
  data: [
    ["some_engine", "https://some_engine.com", "Running"],
    ["some_other_engine", "https://some_other_engine.com", "Running"]
  ],
  rows: 2
};

describe("engine service", () => {
  const server = setupServer();

  server.use(
    // Auth
    rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token"
        })
      );
    }),
    // Resolve account name
    rest.get(
      `https://api.fake.firebolt.io/web/v3/account/my_account/resolve`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            id: "1111",
            region: "us-east-1"
          })
        );
      }
    ),
    // Resolve system engine URL
    rest.get(
      `https://api.fake.firebolt.io/web/v3/account/my_account/engineUrl`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            engineUrl: "https://some_system_engine.com"
          })
        );
      }
    ),
    // Query against system engine
    rest.post(
      `https://some_system_engine.com/${QUERY_URL}`,
      (req, res, ctx) => {
        return res(ctx.json(selectEngineResponse));
      }
    )
  );
  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });
  afterEach(() => {
    inMemoryCache.accountInfoStorage.clear({
      account: "my_account",
      apiEndpoint
    });
    inMemoryCache.engineUrlStorage.clear({
      account: "my_account",
      apiEndpoint
    });
  });

  it("gets engine by name", async () => {
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.getByName("some_engine");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });

  it("gets engine by name v2 status", async () => {
    // Copy
    const engineResponse = JSON.parse(JSON.stringify(selectEngineResponse));
    engineResponse.data.forEach((row: string[]) => {
      row[2] = "RUNNING";
    });
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineResponse));
        }
      )
    );

    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.getByName("some_engine");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });

  it("starts engine", async () => {
    let startEngineCalled = false;
    const expectedEngine = "some_engine";
    const refreshEngineResponse = {
      meta: [
        {
          name: "status",
          type: "text"
        }
      ],
      data: [["Running"]],
      rows: 1
    };
    server.use(
      // Query against system engine
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          if (
            String(req.body)?.startsWith(`START ENGINE "${expectedEngine}"`)
          ) {
            startEngineCalled = true;
          }
          if (String(req.body)?.startsWith("SELECT status")) {
            return res(ctx.json(refreshEngineResponse));
          } else {
            return res(ctx.json(selectEngineResponse));
          }
        }
      )
    );

    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.getByName(expectedEngine);
    const {
      engine: { name: engineName }
    } = await engine.start();
    expect(engineName).toEqual(expectedEngine);
    expect(startEngineCalled).toEqual(true);
  });

  it("stops engine", async () => {
    let stopEngineCalled = false;
    const expectedEngine = "some_engine";
    const refreshEngineResponse = {
      meta: [
        {
          name: "status",
          type: "text"
        }
      ],
      data: [["Stopped"]],
      rows: 1
    };
    server.use(
      // Query against system engine
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          if (String(req.body)?.startsWith(`STOP ENGINE "${expectedEngine}`)) {
            stopEngineCalled = true;
          }
          if (String(req.body)?.startsWith("SELECT status")) {
            return res(ctx.json(refreshEngineResponse));
          } else {
            return res(ctx.json(selectEngineResponse));
          }
        }
      )
    );

    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.getByName(expectedEngine);
    const {
      engine: { name: engineName }
    } = await engine.stop();
    expect(engineName).toEqual(expectedEngine);
    expect(stopEngineCalled).toEqual(true);
  });

  it("gets all engines", async () => {
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(selectEnginesResponse));
        }
      )
    );

    const connectionOptions = {
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    };
    const firebolt = Firebolt({ apiEndpoint });
    const connection = await firebolt.connect(connectionOptions);
    // Also test diffrent way of instantiating a resource manager
    const logger = new Logger();
    const httpClient = new NodeHttpClient();
    new Authenticator(
      {
        httpClient,
        logger,
        apiEndpoint,
        queryFormatter: new QueryFormatter()
      },
      connectionOptions
    );
    const resourceManager = new ResourceManager({
      logger,
      connection,
      apiEndpoint,
      httpClient
    });
    const engines = await resourceManager.engine.getAll();
    expect(engines).toBeTruthy();
    expect(engines[0].endpoint).toEqual("https://some_engine.com");
    expect(engines[1].endpoint).toEqual("https://some_other_engine.com");
  });

  it("gets all engines v2 status", async () => {
    // Copy
    const engineResponse = JSON.parse(JSON.stringify(selectEnginesResponse));
    engineResponse.data.forEach((row: string[]) => {
      row[2] = "RUNNING";
    });
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineResponse));
        }
      )
    );

    const connectionOptions = {
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    };
    const firebolt = Firebolt({ apiEndpoint });
    const connection = await firebolt.connect(connectionOptions);
    // Also test diffrent way of instantiating a resource manager
    const logger = new Logger();
    const httpClient = new NodeHttpClient();
    new Authenticator(
      {
        httpClient,
        logger,
        apiEndpoint,
        queryFormatter: new QueryFormatter()
      },
      connectionOptions
    );
    const resourceManager = new ResourceManager({
      logger,
      connection,
      apiEndpoint,
      httpClient
    });
    const engines = await resourceManager.engine.getAll();
    expect(engines).toBeTruthy();
    expect(engines[0].current_status_summary).toEqual(
      EngineStatusSummary.RUNNING
    );
    expect(engines[1].current_status_summary).toEqual(
      EngineStatusSummary.RUNNING
    );
  });

  it("does not start engine that errors out", async () => {
    let startEngineCalled = false;
    const expectedEngine = "some_engine";
    const refreshEngineResponse = {
      meta: [
        {
          name: "status",
          type: "text"
        }
      ],
      data: [],
      rows: 0
    };
    server.use(
      // Query against system engine
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          if (String(req.body)?.startsWith("START ENGINE " + expectedEngine)) {
            startEngineCalled = true;
          }
          if (String(req.body)?.startsWith("SELECT status")) {
            return res(ctx.json(refreshEngineResponse));
          } else {
            return res(ctx.json(selectEngineResponse));
          }
        }
      )
    );

    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.getByName(expectedEngine);
    await expect(engine.start()).rejects.toThrow(ConnectionError);
  });

  it("does not start engine that has unexpected status", async () => {
    let startEngineCalled = false;
    const expectedEngine = "some_engine";
    const refreshEngineResponse = {
      meta: [
        {
          name: "status",
          type: "text"
        }
      ],
      data: [["Imploding"]],
      rows: 1
    };
    server.use(
      // Query against system engine
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          if (String(req.body)?.startsWith("START ENGINE " + expectedEngine)) {
            startEngineCalled = true;
          }
          if (String(req.body)?.startsWith("SELECT status")) {
            return res(ctx.json(refreshEngineResponse));
          } else {
            return res(ctx.json(selectEngineResponse));
          }
        }
      )
    );

    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.getByName(expectedEngine);
    expect(engine.start()).rejects.toThrowError();
  });

  it("throws deprecation on restart", async () => {
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.getByName("some_engine");
    expect(engine.restart()).rejects.toThrowError(DeprecationError);
  });

  it("create and delete engine", async () => {
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.create("some_engine");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
    try {
      await engine.delete();
      expect(false).toBeTruthy();
    } catch (e) {
      expect(true).toBeTruthy();
    }
  });
  it("create engine v2 with options", async () => {
    server.use(
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/my_account/resolve`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              id: "1111",
              region: "us-east-1",
              infraVersion: 2
            })
          );
        }
      ),
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        async (req, res, ctx) => {
          const requestBody = await req.text();
          if (requestBody.includes("CREATE ENGINE")) {
            expect(requestBody).toContain(`INITIALLY_STOPPED = true`);
            expect(requestBody).toContain(`NODES = 2`);
            expect(requestBody).not.toContain(`SPEC`);
          }
          return res(ctx.json(selectEngineResponse));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.create("some_engine", {
      scale: 2,
      spec: undefined,
      initially_stopped: true
    });
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });
  it("create engine with options", async () => {
    server.use(
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/my_account/resolve`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              id: "1111",
              region: "us-east-1",
              infraVersion: 1
            })
          );
        }
      ),
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        async (req, res, ctx) => {
          const requestBody = await req.text();
          if (requestBody.includes("CREATE ENGINE")) {
            expect(requestBody).toContain(`ENGINE_TYPE = 'GENERAL_PURPOSE'`);
            expect(requestBody).not.toContain(`REGION`);
            expect(requestBody).not.toContain(`SPEC`);
          }
          return res(ctx.json(selectEngineResponse));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const engine = await resourceManager.engine.create("some_engine", {
      region: undefined,
      engine_type: "GENERAL_PURPOSE",
      spec: ""
    });
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });

  it("create engine with environment variable", async () => {
    const engine_version = "20.1.1";
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        async (req, res, ctx) => {
          const requestBody = await req.text();
          if (requestBody.includes("CREATE ENGINE")) {
            expect(requestBody).toContain(`VERSION = '${engine_version}'`);
          }
          return res(ctx.json(selectEngineResponse));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;

    process.env.FB_INTERNAL_OPTIONS_ENGINE_VERSION = engine_version;

    const engine = await resourceManager.engine.create("some_engine");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");

    delete process.env.ENGINE_NAME;
  });

  it("Parses different engine statuses correctly", async () => {
    const statuses = ["RUNNING", "Running", "running"];
    for (const status of statuses) {
      expect(processEngineStatus(status)).toEqual(EngineStatusSummary.RUNNING);
    }
    expect(processEngineStatus(undefined)).toBe(undefined);
    expect(processEngineStatus("unexisting")).not.toBeTruthy();
  });
});
