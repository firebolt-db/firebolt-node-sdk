import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../src/index";
import { ConnectionOptions } from "../../src/types";
import { QUERY_URL } from "../../src/common/api";

const apiEndpoint = "fake.api.com";

describe("connection user agent", () => {
  const server = setupServer();

  server.use(
    rest.post(`https://fake.api.com/oauth/token`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token"
        })
      );
    }),
    rest.get(
      `https://fake.api.com/web/v3/account/my_account/resolve`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            id: "1111",
            region: "us-east-1"
          })
        );
      }
    ),
    rest.get(
      `https://fake.api.com/web/v3/account/my_account/engineUrl`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            engineUrl: "https://some_system_engine.com"
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
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          expect(req.headers.get("user-agent")).toContain("NodeSDK");
          return res(ctx.status(200), ctx.json({ data: [] }));
        }
      )
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
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          expect(req.headers.get("user-agent")).toContain("NodeSDK");
          expect(req.headers.get("user-agent")).toContain("ClientA/1.1.1");
          expect(req.headers.get("user-agent")).toContain("DriverA/2.2.2");
          return res(ctx.status(200), ctx.json({ data: [] }));
        }
      )
    );
    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    await statement.fetchResult();
  });
});
