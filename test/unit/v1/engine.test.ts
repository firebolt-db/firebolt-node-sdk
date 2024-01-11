import { setupServer } from "msw/node";
import { rest } from "msw";
import { NodeHttpClient } from "../../../src/http/node";
import { Logger } from "../../../src/logger/node";
import { ResourceManager } from "../../../src/service";
import { QueryFormatter } from "../../../src/formatter";
import { Firebolt } from "../../../src";
import { Authenticator } from "../../../src/auth";

const apiEndpoint = "fake.api.com";
const logger = new Logger();
const engineObject = {
  id: {
    engine_id: "123",
    account_id: "some_account"
  },
  name: "some_engine",
  endpoint: "https://some_engine.com"
};

describe("engine service", () => {
  const server = setupServer();
  server.use(
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines:getIdByName`,
      (req, res, ctx) => {
        return res(ctx.json(engineObject.id));
      }
    ),
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines/123`,
      (req, res, ctx) => {
        return res(ctx.json(engineObject));
      }
    ),
    // Authentication
    rest.post(`https://${apiEndpoint}/auth/v1/login`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token",
          refresh_token: "fake_refresh_token"
        })
      );
    }),
    // Get account id
    rest.get(
      `https://${apiEndpoint}/iam/v2/accounts:getIdByName`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            account_id: "some_account"
          })
        );
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
    const connectionOptions = {
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
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
    const engine = await resourceManager.engine.getByName("some_engine");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });
  it("starts engine", async () => {
    server.use(
      rest.post(
        `https://${apiEndpoint}/core/v1/accounts/some_account/engines/123:start`,
        (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({ engine: { name: "some_engine" } })
          );
        }
      )
    );
    const connectionOptions = {
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
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
      httpClient,
      apiEndpoint,
      logger,
      connection
    });
    const engine = await resourceManager.engine.getByName("some_engine");
    const {
      engine: { name: engine_name }
    } = await engine.start();
    expect(engine_name).toEqual("some_engine");
  });

  it("stops engine", async () => {
    server.use(
      rest.post(
        `https://${apiEndpoint}/core/v1/accounts/some_account/engines/123:stop`,
        (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({ engine: { name: "some_engine" } })
          );
        }
      )
    );

    const connectionOptions = {
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
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
      httpClient,
      apiEndpoint,
      logger,
      connection
    });
    const engine = await resourceManager.engine.getByName("some_engine");
    const {
      engine: { name: engine_name }
    } = await engine.stop();
    expect(engine_name).toEqual("some_engine");
  });
});
