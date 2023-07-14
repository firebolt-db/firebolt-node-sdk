import { setupServer } from "msw/node";
import { rest } from "msw";
import { Logger } from "../../src/logger/node";
import { QUERY_URL } from "../../src/common/api";
import { Firebolt } from "../../src";
import { ResourceManager } from "../../src/service";
import { ConnectionError, DeprecationError } from "../../src/common/errors";

const apiEndpoint = "api.fake.firebolt.io";

const selectEngineResponse = {
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

const selectEnginesResponse = {
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
          if (String(req.body)?.startsWith("STOP ENGINE " + expectedEngine)) {
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
    const firebolt = Firebolt({ apiEndpoint });
    const connection = await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    // Also test diffrent way of instantiating a resource manager
    const logger = new Logger();
    const resourceManager = new ResourceManager({
      logger,
      connection
    });
    const engines = await resourceManager.engine.getAll();
    expect(engines).toBeTruthy();
    expect(engines[0].endpoint).toEqual("https://some_engine.com");
    expect(engines[1].endpoint).toEqual("https://some_other_engine.com");
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
    expect(engine.start()).rejects.toThrowError(ConnectionError);
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
});
