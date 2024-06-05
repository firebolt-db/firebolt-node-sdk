import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../../src";
import { ConnectionOptions } from "../../../src/types";
import { AccountNotFoundError } from "../../../src/common/errors";
import { ConnectionV2 } from "../../../src/connection/connection_v2";
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

const selectOneResponse = {
  meta: [
    {
      name: "one",
      type: "Int32"
    }
  ],
  data: [
    {
      one: 1
    }
  ],
  rows: 1
};

const selectAttachedToResponse = {
  meta: [
    {
      name: "attached_to",
      type: "Text"
    }
  ],
  data: [["dummy2"]],
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

  it("shows a helpful error message on account not found", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    server.use(
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/invalid_account/resolve`,
        (req, res, ctx) => {
          return res(ctx.status(404));
        }
      ),
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/invalid_account/engineUrl`,
        (req, res, ctx) => {
          return res(ctx.status(404));
        }
      )
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "invalid_account"
    };

    await expect(async () => {
      await firebolt.testConnection(connectionParams);
    }).rejects.toThrow(AccountNotFoundError);
  });
  it("retrieves account version", async () => {
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
        `https://api.fake.firebolt.io/web/v3/account/my_account/resolve`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              id: "123",
              infraVersion: 2
            })
          );
        }
      ),
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
      account: "my_account"
    };

    const connection = await firebolt.connect(connectionParams);
    const accountInfo = await (connection as ConnectionV2).resolveAccountInfo();
    expect(accountInfo.infraVersion).toBe(2);
  });
  it("defaults account version to 1 if not provided", async () => {
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
        `https://api.fake.firebolt.io/web/v3/account/my_account/resolve`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              id: "123"
            })
          );
        }
      ),
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/my_account/engineUrl`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              engineUrl: "https://some_system_engine.com"
            })
          );
        }
      )
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      account: "my_account"
    };

    const connection = await firebolt.connect(connectionParams);
    const accountInfo = await (connection as ConnectionV2).resolveAccountInfo();
    expect(accountInfo.infraVersion).toBe(1);
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
        `https://api.fake.firebolt.io/web/v3/account/my_account/resolve`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              id: "123",
              infraVersion: 2
            })
          );
        }
      ),
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
  it("caches account info", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    let resolveCalls = 0;
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
        `https://api.fake.firebolt.io/web/v3/account/my_account/resolve`,
        (req, res, ctx) => {
          resolveCalls++;
          return res(
            ctx.json({
              id: "123",
              infraVersion: 2
            })
          );
        }
      ),
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

    const connection = await firebolt.connect(connectionParams);
    const accountInfo = await (connection as ConnectionV2).resolveAccountInfo();

    const connection2 = await firebolt.connect(connectionParams);
    const accountInfo2 = await (
      connection2 as ConnectionV2
    ).resolveAccountInfo();

    expect(accountInfo).toStrictEqual(accountInfo2);

    expect(resolveCalls).toBe(1);
    expect(engineUrlCalls).toBe(1);
  });
  it("respects useCache option", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    let resolveCalls = 0;
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
        `https://api.fake.firebolt.io/web/v3/account/my_account/resolve`,
        (req, res, ctx) => {
          resolveCalls++;
          return res(
            ctx.json({
              id: "123",
              infraVersion: 2
            })
          );
        }
      ),
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

    const connection = await firebolt.connect(connectionParams);
    await (connection as ConnectionV2).resolveAccountInfo();

    const connection2 = await firebolt.connect(connectionParams);
    await (connection2 as ConnectionV2).resolveAccountInfo();

    expect(resolveCalls).toBe(2);
    expect(engineUrlCalls).toBe(2);
  });
});
