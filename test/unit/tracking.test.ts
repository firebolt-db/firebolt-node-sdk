import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../src/index";
import { ConnectionOptions } from "../../src/types";

const apiEndpoint = "fake.api.com";

describe("connection user agent", () => {
  const server = setupServer();

  server.use(
    rest.post(`https://id.app.firebolt.io/oauth/token`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token"
        })
      );
    }),
    rest.get(
      `https://${apiEndpoint}/v3/getGatewayHostByAccountName/my_account`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            gatewayHost: "https://some_system_engine.com"
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
        client_id: "dummy",
        client_secret: "dummy"
      },
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    server.use(
      rest.post("https://some_system_engine.com", (req, res, ctx) => {
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
        client_id: "dummy",
        client_secret: "dummy"
      },
      account: "my_account",
      additionalParameters: {
        userClients: [{ name: "ClientA", version: "1.1.1" }],
        userDrivers: [{ name: "DriverA", version: "2.2.2" }]
      }
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    server.use(
      rest.post("https://some_system_engine.com", (req, res, ctx) => {
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
