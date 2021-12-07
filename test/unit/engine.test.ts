import { setupServer } from "msw/node";
import { rest } from "msw";
import { NodeHttpClient } from "../../src/http/node";
import { Logger } from "../../src/logger/node";
import { ResourceManager } from "../../src/service";

const apiUrl = "fake.api.com";
const logger = new Logger();

describe("engine service", () => {
  const server = setupServer();
  server.use(
    rest.get(
      `https://${apiUrl}/core/v1/account/engines:getIdByName`,
      (req, res, ctx) => {
        const engine_id = {
          engine_id: "123",
          account_id: "some_account"
        };
        return res(ctx.json({ engine_id }));
      }
    ),
    rest.get(
      `https://${apiUrl}/core/v1/accounts/some_account/engines/123`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            engine: {
              id: "123",
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
    const resourceManager = new ResourceManager({ httpClient, apiUrl, logger });
    const engine = await resourceManager.engine.getByName("some_engine");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });
  it("gets engine by id", async () => {
    const httpClient = new NodeHttpClient();
    const resourceManager = new ResourceManager({ httpClient, apiUrl, logger });
    const engine = await resourceManager.engine.getById("123", "some_account");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });
});
