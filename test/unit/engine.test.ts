import { setupServer } from "msw/node";
import { rest } from "msw";
import { NodeHttpClient } from "../../src/http/node";
import { Logger } from "../../src/logger/node";
import { ResourceManager } from "../../src/service";
import { QueryFormatter } from "../../src/formatter";

const apiEndpoint = "fake.api.com";
const logger = new Logger();
const env = "app";

describe("engine service", () => {
  const server = setupServer();
  server.use(
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines:getIdByName`,
      (req, res, ctx) => {
        const engine_id = {
          engine_id: "123",
          account_id: "some_account"
        };
        return res(ctx.json({ engine_id }));
      }
    ),
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines/123`,
      (req, res, ctx) => {
        const engine_id = {
          engine_id: "123",
          account_id: "some_account"
        };
        return res(
          ctx.json({
            engine: {
              id: engine_id,
              name: "some_engine",
              endpoint: "https://some_engine.com"
            }
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
    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const resourceManager = new ResourceManager({
      httpClient,
      apiEndpoint,
      logger,
      queryFormatter,
      env
    });
    resourceManager.account.id = "some_account";
    const engine = await resourceManager.engine.getByName("some_engine");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });
  it("gets engine by id", async () => {
    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const resourceManager = new ResourceManager({
      httpClient,
      apiEndpoint,
      logger,
      queryFormatter,
      env
    });
    resourceManager.account.id = "some_account";
    const engine = await resourceManager.engine.getById("123");
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
            ctx.json({ engine: { id: { engine_id: 123 } } })
          );
        }
      )
    );

    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const resourceManager = new ResourceManager({
      httpClient,
      apiEndpoint,
      logger,
      queryFormatter,
      env
    });
    resourceManager.account.id = "some_account";
    const engine = await resourceManager.engine.getById("123");
    const {
      engine: {
        id: { engine_id }
      }
    } = await engine.start();
    expect(engine_id).toEqual(123);
  });

  it("stops engine", async () => {
    server.use(
      rest.post(
        `https://${apiEndpoint}/core/v1/accounts/some_account/engines/123:stop`,
        (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({ engine: { id: { engine_id: 123 } } })
          );
        }
      )
    );

    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const resourceManager = new ResourceManager({
      httpClient,
      apiEndpoint,
      logger,
      queryFormatter,
      env
    });
    resourceManager.account.id = "some_account";
    const engine = await resourceManager.engine.getById("123");
    const {
      engine: {
        id: { engine_id }
      }
    } = await engine.stop();
    expect(engine_id).toEqual(123);
  });
});
