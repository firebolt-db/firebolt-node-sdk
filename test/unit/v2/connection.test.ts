import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../../src";
import { ConnectionOptions } from "../../../src/types";
import { QUERY_URL } from "../../../src/common/api";
import { inMemoryCache } from "../../../src/common/tokenCache";

const apiEndpoint = "api.fake.firebolt.io";

const engineUrlResponse = {
  meta: [
    {
      name: "url",
      type: "Text"
    },
    {
      name: "database_name",
      type: "Text"
    },
    {
      name: "status",
      type: "Text"
    }
  ],
  data: [["https://some_engine.com", "dummy", "Running"]],
  rows: 1
};

describe("Connection V2", () => {
  const server = setupServer();

  server.use(
    rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token"
        })
      );
    })
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

  it("respects system engine query parameters for account version 2", async () => {
    let systemEngineParamsUsed = {};
    server.use(
      rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
        return res(
          ctx.json({
            access_token: "fake_access_token"
          })
        );
      }),
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/my_account/engineUrl`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              engineUrl: "https://some_system_engine.com?param=value"
            })
          );
        }
      ),
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          systemEngineParamsUsed = Object.fromEntries(
            req.url.searchParams.entries()
          );
          return res(ctx.json(engineUrlResponse));
        }
      )
    );
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      account: "my_account"
    };

    const connection = await firebolt.connect(connectionParams);
    await connection.execute("SELECT 1");
    expect(systemEngineParamsUsed).toHaveProperty("param");
    expect(systemEngineParamsUsed).not.toHaveProperty("account_id");
  });
  it("caches system engine info", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    let engineUrlCalls = 0;

    server.use(
      rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
        return res(
          ctx.json({
            access_token: "fake_access_token"
          })
        );
      }),
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/my_account/engineUrl`,
        (req, res, ctx) => {
          engineUrlCalls++;
          return res(
            ctx.json({
              engineUrl: "https://some_system_engine.com"
            })
          );
        }
      ),
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineUrlResponse));
        }
      )
    );

    inMemoryCache.accountInfoStorage.clear({
      account: "my_account",
      apiEndpoint
    });
    inMemoryCache.engineUrlStorage.clear({
      account: "my_account",
      apiEndpoint
    });

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      account: "my_account"
    };

    await firebolt.connect(connectionParams);

    await firebolt.connect(connectionParams);

    expect(engineUrlCalls).toBe(1);
  });
  it("testConnection works", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    server.use(
      rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
        return res(
          ctx.json({
            access_token: "fake_access_token"
          })
        );
      }),
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
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          const urlParams = Object.fromEntries(req.url.searchParams.entries());
          expect(urlParams).toHaveProperty("auto_start_stop_control");
          return res(ctx.json(engineUrlResponse));
        }
      )
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      account: "my_account"
    };

    const connection = await firebolt.connect(connectionParams);
    await connection.testConnection();
    // also test the method from core
    await firebolt.testConnection(connectionParams);
  });
  it("respects useCache option", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    let engineUrlCalls = 0;

    server.use(
      rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
        return res(
          ctx.json({
            access_token: "fake_access_token"
          })
        );
      }),
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/my_account/engineUrl`,
        (req, res, ctx) => {
          engineUrlCalls++;
          return res(
            ctx.json({
              engineUrl: "https://some_system_engine.com"
            })
          );
        }
      ),
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineUrlResponse));
        }
      )
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      account: "my_account",
      useCache: false
    };

    await firebolt.connect(connectionParams);

    await firebolt.connect(connectionParams);

    expect(engineUrlCalls).toBe(2);
  });
});
