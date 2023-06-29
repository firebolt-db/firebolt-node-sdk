import { setupServer } from "msw/node";
import { rest } from "msw";
import { NodeHttpClient } from "../../src/http/node";
import { Logger } from "../../src/logger/node";
import { ResourceManager } from "../../src/service";
import { QueryFormatter } from "../../src/formatter";
import { QUERY_URL } from "../../src/common/api";

const apiEndpoint = "api.fake.firebolt.io";
const logger = new Logger();

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
    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const resourceManager = new ResourceManager({
      httpClient,
      apiEndpoint,
      logger,
      queryFormatter
    });
    await resourceManager.authenticate({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
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
          if (req.body?.startsWith("START ENGINE " + expectedEngine)) {
            startEngineCalled = true;
          }
          if (req.body?.startsWith("SELECT status")) {
            return res(ctx.json(refreshEngineResponse));
          } else {
            return res(ctx.json(selectEngineResponse));
          }
        }
      )
    );

    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const resourceManager = new ResourceManager({
      httpClient,
      apiEndpoint,
      logger,
      queryFormatter
    });

    await resourceManager.authenticate({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
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
          if (req.body?.startsWith("STOP ENGINE " + expectedEngine)) {
            stopEngineCalled = true;
          }
          if (req.body?.startsWith("SELECT status")) {
            return res(ctx.json(refreshEngineResponse));
          } else {
            return res(ctx.json(selectEngineResponse));
          }
        }
      )
    );

    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const resourceManager = new ResourceManager({
      httpClient,
      apiEndpoint,
      logger,
      queryFormatter
    });

    await resourceManager.authenticate({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const engine = await resourceManager.engine.getByName(expectedEngine);
    const {
      engine: { name: engineName }
    } = await engine.stop();
    expect(engineName).toEqual(expectedEngine);
    expect(stopEngineCalled).toEqual(true);
  });
});
