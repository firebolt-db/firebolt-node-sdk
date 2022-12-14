import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../src/index";
import { ConnectionOptions } from "../../src/types";

const apiEndpoint = "fake.api.com";

describe("connection user agent", () => {
  const server = setupServer();

  server.use(
    rest.post(`https://${apiEndpoint}/auth/v1/login`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token",
          refresh_token: "fake_refresh_token"
        })
      );
    }),
    rest.get(
      `https://${apiEndpoint}/iam/v2/accounts:getIdByName`,
      (req, res, ctx) => {
        return res(ctx.json({ account_id: "some_account" }));
      }
    ),
    rest.get(`https://${apiEndpoint}/iam/v2/account`, (req, res, ctx) => {
      return res(ctx.json({ account: { id: "some_account" } }));
    }),
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines:getIdByName`,
      (req, res, ctx) => {
        const engine_id = {
          engine_id: "123",
          account_id: "some_account",
          endpoint: "https://some_engine.com"
        };
        return res(ctx.json({ engine_id }));
      }
    ),
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines/123`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            engine: {
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

  it("propagation", async () => {
    const connectionParams: ConnectionOptions = {
      auth: {
        username: "dummy",
        password: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    server.use(
      rest.post("https://some_engine.com", (req, res, ctx) => {
        expect(req.headers.get("user-agent")).toContain("NodeSDK");
        return res(ctx.status(200), ctx.json({ data: [] }));
      })
    );

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    await statement.fetchResult();
  });
  it("customisation", async () => {
    const connectionParams: ConnectionOptions = {
      auth: {
        username: "dummy",
        password: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      additionalParameters: {
        userClients: [{ name: "ClientA", version: "1.1.1" }],
        userDrivers: [{ name: "DriverA", version: "2.2.2" }]
      }
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    server.use(
      rest.post("https://some_engine.com", (req, res, ctx) => {
        expect(req.headers.get("user-agent")).toContain("NodeSDK");
        expect(req.headers.get("user-agent")).toContain("ClientA/1.1.1");
        expect(req.headers.get("user-agent")).toContain("DriverA/2.2.2");
        return res(ctx.status(200), ctx.json({ data: [] }));
      })
    );
    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    await statement.fetchResult();
  });
});
