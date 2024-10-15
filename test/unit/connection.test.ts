import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../src";
import { QueryFormatterV2 as QueryFormatter } from "../../src/formatter/formatter_v2";
import { ConnectionOptions } from "../../src/types";
import { QUERY_URL } from "../../src/common/api";
import { ConnectionV2 } from "../../src/connection/connection_v2";
import { Authenticator } from "../../src/auth";
import { Logger } from "../../src/logger/node";
import { NodeHttpClient } from "../../src/http/node";
import { inMemoryCache } from "../../src/common/tokenCache";

const apiEndpoint = "api.fake.firebolt.io";

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

const emptyResponse = {
  meta: [],
  data: [],
  rows: 0
};

function resetServerHandlers(server: any) {
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
            id: "1111",
            region: "us-east-1"
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
        if (req.body == 'USE DATABASE "dummy"') {
          return res(
            ctx.json(emptyResponse),
            ctx.set(
              "Firebolt-Update-Parameters",
              "database=dummy,other_param=2"
            )
          );
        }
        if (req.body == 'USE ENGINE "dummy"') {
          return res(
            ctx.json(emptyResponse),
            ctx.set(
              "Firebolt-Update-Endpoint",
              "https://some_engine.com?engine=dummy&another_eng_param=1"
            )
          );
        }
        return res(ctx.json(selectOneResponse));
      }
    ),
    rest.post("https://some_engine.com", (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(selectOneResponse));
    })
  );
}

describe("Connection", () => {
  const server = setupServer();
  resetServerHandlers(server);

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
    resetServerHandlers(server);
  });

  it("throws an error when error json is present", async () => {
    server.use(
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        const body = await req.text();
        if (body.startsWith("SELECT 'blue'::int")) {
          return res(
            ctx.status(200),
            ctx.json({
              errors: [
                {
                  code: "CMP0001",
                  name: "CAST_ERROR",
                  severity: "ERROR",
                  description: "Can't cast string to int"
                },
                {
                  name: "SYNTAX_ERROR",
                  severity: "INFO",
                  description: "Unexpected character",
                  location: {
                    failingLine: 42,
                    startOffset: 120,
                    endOffset: 135
                  }
                }
              ]
            })
          );
        }
        return res(ctx.json(selectOneResponse));
      })
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    await expect(connection.execute("SELECT 'blue'::int,k")).rejects.toThrow(
      `ERROR: CAST_ERROR (CMP0001) - Can't cast string to int,
INFO: SYNTAX_ERROR - Unexpected character at {"failingLine":42,"startOffset":120,"endOffset":135}`
    );
  });

  it("throws an error when error json 2 is present", async () => {
    server.use(
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        const body = await req.text();
        if (body.startsWith("SELECT 'blue'::int")) {
          return res(
            ctx.status(200),
            ctx.json({
              errors: [
                {
                  code: "CMP0001",
                  name: "CAST_ERROR",
                  severity: "ERROR",
                  description: "Can't cast string to int"
                },
                {
                  name: "SYNTAX_ERROR",
                  severity: "INFO",
                  description: "Unexpected character",
                  location: {
                    failingLine: 42,
                    startOffset: 120,
                    endOffset: 135
                  }
                }
              ]
            })
          );
        }
        return res(ctx.json(selectOneResponse));
      })
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    await expect(connection.execute("SELECT 'blue'::int,k")).rejects.toThrow(
      `ERROR: CAST_ERROR (CMP0001) - Can't cast string to int,
INFO: SYNTAX_ERROR - Unexpected character at {"failingLine":42,"startOffset":120,"endOffset":135}`
    );
  });
  it("Doesn't break if parsing is impossible", async () => {
    const headers = {
      "Content-Type": "application/json",
      dummy: "header"
    };
    for (const [k, v] of Object.entries(headers)) {
      server.use(
        rest.post(`https://some_engine.com`, async (req, res, ctx) => {
          const body = await req.text();
          if (body.startsWith("SELECT 'blue'::int")) {
            return res(
              ctx.status(200),
              ctx.body("{invalid json}"),
              ctx.set(k, v)
            );
          }
          return res(ctx.json(selectOneResponse));
        })
      );

      const connectionParams: ConnectionOptions = {
        auth: {
          client_id: "dummy",
          client_secret: "dummy"
        },
        database: "dummy",
        engineName: "dummy",
        account: "my_account"
      };
      const firebolt = Firebolt({
        apiEndpoint
      });

      const connection = await firebolt.connect(connectionParams);
      await expect(
        connection.execute("SELECT 'blue'::int")
      ).resolves.not.toThrow();
    }
  });
  it("database and engine", async () => {
    let paramsUsed = {};
    server.use(
      rest.post("https://some_engine.com", (req, res, ctx) => {
        paramsUsed = Object.fromEntries(req.url.searchParams.entries());
        return res(ctx.status(200), ctx.json(selectOneResponse));
      })
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toEqual(1);
    expect(connection.engineEndpoint).toEqual("https://some_engine.com/");
    expect(paramsUsed).toHaveProperty("database", "dummy");
    expect(paramsUsed).toHaveProperty("engine", "dummy");
    // Extra params in USE DATABASE are ignored
    // But in USE ENGINE, they are used
    expect(paramsUsed).not.toHaveProperty("other_param");
    expect(paramsUsed).toHaveProperty("another_eng_param", "1");
  });

  it("no database and correct engine", async () => {
    let paramsUsed = {};
    server.use(
      rest.post("https://some_engine.com", (req, res, ctx) => {
        paramsUsed = Object.fromEntries(req.url.searchParams.entries());
        return res(ctx.status(200), ctx.json(selectOneResponse));
      })
    );
    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toEqual(1);
    expect(paramsUsed).toHaveProperty("engine");
    expect(paramsUsed).not.toHaveProperty("database");
  });

  it("no database and no engine", async () => {
    let paramsUsed = {};
    server.use(
      rest.post("https://some_engine.com", (req, res, ctx) => {
        paramsUsed = Object.fromEntries(req.url.searchParams.entries());
        return res(ctx.status(200), ctx.json(selectOneResponse));
      })
    );
    // Use system engine in this case
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

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toEqual(1);
    expect(paramsUsed).not.toHaveProperty("engine");
    expect(paramsUsed).not.toHaveProperty("database");
  });

  it("database and no engine", async () => {
    let paramsUsed = {};
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          if (req.body == 'USE DATABASE "my_db"') {
            return res(
              ctx.json(emptyResponse),
              ctx.set("Firebolt-Update-Parameters", "database=my_db")
            );
          }
          paramsUsed = Object.fromEntries(req.url.searchParams.entries());
          return res(ctx.status(200), ctx.json(selectOneResponse));
        }
      )
    );
    // System engine with database defined
    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "my_db",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toEqual(1);
    expect(paramsUsed).toHaveProperty("database");
    expect(paramsUsed).not.toHaveProperty("engine");
  });

  it("handles reset session header", async () => {
    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };

    let searchParamsUsed = new URLSearchParams();
    server.use(
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        const body = await req.text();
        if (body.startsWith("USE ENGINE")) {
          return res(
            ctx.json(selectOneResponse),
            ctx.set("Firebolt-Reset-Session", "")
          );
        }
        if (body.startsWith("SELECT 2")) {
          searchParamsUsed = req.url.searchParams;
          return res(ctx.json(selectOneResponse));
        }
      })
    );

    class MockConnection extends ConnectionV2 {
      updateParameters(params: Record<string, string>) {
        this.parameters = {
          ...this.parameters,
          ...params
        };
      }
    }

    // A hack to allow updating connection parameters stored internally
    async function mockConnect(connectionOptions: ConnectionOptions) {
      const context = {
        logger: new Logger(),
        httpClient: new NodeHttpClient(),
        apiEndpoint
      };
      const queryFormatter = new QueryFormatter();
      const auth = new Authenticator(context, connectionOptions);
      const connection = new MockConnection(
        queryFormatter,
        context,
        connectionOptions
      );
      await auth.authenticate();
      await connection.resolveEngineEndpoint();
      return connection;
    }

    const connection = await mockConnect(connectionParams);
    connection.updateParameters({ param: "value" });

    await connection.execute("SELECT 2");
    expect(searchParamsUsed.get("param")).toEqual("value");
    expect(searchParamsUsed.get("database")).toEqual("dummy");

    await connection.execute("USE ENGINE other_engine");

    await connection.execute("SELECT 2");
    expect(searchParamsUsed.get("param")).toEqual(null);
    expect(searchParamsUsed.get("database")).toEqual("dummy");
  });

  it("handles set statements correctly", async () => {
    let searchParamsUsed = new URLSearchParams();
    server.use(
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        const body = await req.text();
        if (body.startsWith("SELECT 1")) {
          searchParamsUsed = req.url.searchParams;
          return res(ctx.json(selectOneResponse));
        }
      })
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    await connection.execute("SET param=value");
    await connection.execute("SELECT 1");
    expect(searchParamsUsed.get("param")).toEqual("value");
  });

  it("handles settings in execute", async () => {
    server.use(
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        const body = await req.text();
        const urlParams = Object.fromEntries(req.url.searchParams.entries());
        expect(urlParams).toHaveProperty("param");
        if (body.startsWith("SELECT 1")) {
          return res(ctx.json(emptyResponse));
        }
      })
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    await connection.execute("SELECT 1", { settings: { param: "value" } });
  });


  it("handles invalid set statements correctly", async () => {
    let searchParamsUsed = new URLSearchParams();
    let searchParamsUsed2 = new URLSearchParams();
    server.use(
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        const body = await req.text();
        if (body.startsWith("SELECT 1")) {
          searchParamsUsed = req.url.searchParams;
          return res(ctx.status(500));
        }
        if (body.startsWith("SELECT 2")) {
          searchParamsUsed2 = req.url.searchParams;
          return res(ctx.json(emptyResponse));
        }
      })
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    await expect(connection.execute("SET param=value")).rejects.toThrow();
    await connection.execute("SELECT 2");
    expect(searchParamsUsed.get("param")).toEqual("value");
    expect(searchParamsUsed2.get("param")).toEqual(null);
  });

  it("handles large response bodies correctly", async () => {
    const largeResponse = {
      data: Array(1000).fill({ one: 1, two: 2, three: 3 })
    };
    server.use(
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        return res(ctx.json(largeResponse));
      })
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    expect(data.length).toEqual(1000);
  }, 10000);
});
