import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt, QueryFormatter } from "../../src";
import { ConnectionOptions } from "../../src/types";
import { QUERY_URL } from "../../src/common/api";
import { ConnectionV2 } from "../../src/connection/connection_v2";
import { Authenticator } from "../../src/auth";
import { Logger } from "../../src/logger/node";
import { NodeHttpClient } from "../../src/http/node";
import { inMemoryCache } from "../../src/common/tokenCache";

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

const emptyResponse = {
  meta: [],
  data: [],
  rows: 0
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

describe("Connection", () => {
  const server = setupServer();

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
        return res(ctx.json(engineUrlResponse));
      }
    ),
    rest.post("https://some_engine.com", (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(selectOneResponse));
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

  it("throws an error when error body is present", async () => {
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
  it("throws an error when error body is present", async () => {
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

    // Is there a better way to ensure this is being called?
    let callNum = 0;

    server.use(
      rest.post("https://some_engine.com", (req, res, ctx) => {
        callNum += 1;
        return res(ctx.status(200), ctx.json(selectOneResponse));
      })
    );

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(callNum).toEqual(1);
    expect(record.one).toEqual(1);
  });

  it("no database and correct engine", async () => {
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

    let callNum = 0;

    // Deep copy
    const engineUrlResponseOverride = JSON.parse(
      JSON.stringify(engineUrlResponse)
    );
    engineUrlResponseOverride.data[0][1] = "dummy2";

    server.use(
      rest.post("https://some_engine.com", (req, res, ctx) => {
        callNum += 1;
        expect(req.url.toString()).toContain("database=dummy2");
        return res(ctx.status(200), ctx.json(selectOneResponse));
      }),
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          if (
            String(req.body)?.startsWith("SELECT engs.url, dbs.database_name")
          ) {
            return res(ctx.json(engineUrlResponseOverride));
          } else {
            return res(ctx.json(selectAttachedToResponse));
          }
        }
      )
    );

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(callNum).toEqual(1);
    expect(record.one).toEqual(1);
  });

  it("no database and no engine", async () => {
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

    // Returning query result from sys engine
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          if (req.body) {
            expect(req.url.toString()).not.toContain("database=");
            return res(ctx.json(selectOneResponse));
          } else {
            return res(ctx.json(engineUrlResponse));
          }
        }
      )
    );

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toEqual(1);
  });

  it("database and no engine", async () => {
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

    // Returning query result from sys engine
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          if (req.body) {
            expect(req.url.toString()).toContain("database=my_db");
            return res(ctx.json(selectOneResponse));
          } else {
            return res(ctx.json(engineUrlResponse));
          }
        }
      )
    );

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toEqual(1);
  });

  it("wrong database and correct engine", async () => {
    // Should break
    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy_wrong",
      engineName: "dummy",
      account: "my_account"
    };
    const firebolt = Firebolt({
      apiEndpoint
    });

    // Revert to standard response
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineUrlResponse));
        }
      )
    );

    await expect(firebolt.connect(connectionParams)).rejects.toThrow(
      "Engine dummy is not attached to dummy_wrong."
    );
  });

  it("stopped engine", async () => {
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

    const stoppedEngineResponse = JSON.parse(JSON.stringify(engineUrlResponse));
    stoppedEngineResponse.data[0][2] = "Stopped";

    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(stoppedEngineResponse));
        }
      )
    );

    await expect(firebolt.connect(connectionParams)).rejects.toThrow(
      "Engine dummy is not running"
    );
  });

  it("handles update parameters header", async () => {
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

    let otherDbUsed = false;
    server.use(
      // Return engine url
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineUrlResponse));
        }
      ),
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        if ((await req.text()).startsWith("USE DATABASE")) {
          return res(
            ctx.json(selectOneResponse),
            ctx.set(
              "Firebolt-Update-Parameters",
              "database= dummy2,other=parameter"
            )
          );
        }
        if (req.url.searchParams.get("database") === "dummy2") {
          otherDbUsed = true;
          return res(ctx.json(selectOneResponse));
        }
      })
    );

    const connection = await firebolt.connect(connectionParams);
    await connection.execute("USE DATABASE dummy2");
    await connection.execute("SELECT 1");
    expect(otherDbUsed).toEqual(true);
  });

  it("handles update endpoint header", async () => {
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

    let otherEngineUsed = false;
    let searchParamsUsed = new URLSearchParams();
    server.use(
      // Return engine url
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineUrlResponse));
        }
      ),
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        if ((await req.text()).startsWith("USE ENGINE")) {
          return res(
            ctx.json(selectOneResponse),
            ctx.set(
              "Firebolt-Update-Endpoint",
              "https://some_other_engine.com?param=value"
            )
          );
        }
      }),
      rest.post(`https://some_other_engine.com`, async (req, res, ctx) => {
        otherEngineUsed = true;
        searchParamsUsed = req.url.searchParams;
        return res(ctx.json(selectOneResponse));
      })
    );

    const connection = await firebolt.connect(connectionParams);
    await connection.execute("USE ENGINE other_engine");
    await connection.execute("SELECT 1");
    expect(otherEngineUsed).toEqual(true);
    expect(searchParamsUsed.get("param")).toEqual("value");
  });

  it("validates account_id in update endpoint header", async () => {
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

    server.use(
      // Return engine url
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineUrlResponse));
        }
      ),
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        if ((await req.text()).startsWith("USE ENGINE")) {
          return res(
            ctx.json(selectOneResponse),
            ctx.set(
              "Firebolt-Update-Endpoint",
              "https://some_other_engine.com?param=value&account_id=different_account"
            )
          );
        }
      })
    );

    const connection = await firebolt.connect(connectionParams);
    await expect(
      connection.execute("USE ENGINE other_engine")
    ).rejects.toThrow();
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
      // Return engine url
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(engineUrlResponse));
        }
      ),
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        const body = await req.text();
        if (body.startsWith("USE ENGINE")) {
          return res(
            ctx.json(selectOneResponse),
            ctx.set("Firebolt-Reset-Session", "")
          );
        }
        if (body.startsWith("SELECT 1")) {
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
        apiEndpoint,
        queryFormatter: new QueryFormatter()
      };

      const auth = new Authenticator(context, connectionOptions);
      const connection = new MockConnection(context, connectionOptions);
      await auth.authenticate();
      await connection.resolveEngineEndpoint();
      return connection;
    }

    const connection = await mockConnect(connectionParams);
    connection.updateParameters({ param: "value" });

    await connection.execute("SELECT 1");
    expect(searchParamsUsed.get("param")).toEqual("value");
    expect(searchParamsUsed.get("database")).toEqual("dummy");

    await connection.execute("USE ENGINE other_engine");

    await connection.execute("SELECT 1");
    expect(searchParamsUsed.get("param")).toEqual(null);
    expect(searchParamsUsed.get("database")).toEqual("dummy");
  });

  it("uses sql to connect to account v2", async () => {
    let databaseUsed = "";
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
              region: "us-east-1",
              infraVersion: "2"
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
          return res(
            ctx.json(emptyResponse),
            ctx.set("Firebolt-Update-Endpoint", "https://some_engine.com")
          );
        }
      ),
      rest.post(`https://some_engine.com`, async (req, res, ctx) => {
        if ((await req.text()).startsWith("USE DATABASE")) {
          return res(
            ctx.json(emptyResponse),
            ctx.set("Firebolt-Update-Parameters", "database=dummy")
          );
        } else {
          databaseUsed = req.url.searchParams.get("database") ?? "";
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
    await connection.execute("SELECT 1");
    expect(databaseUsed).toEqual("dummy");
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
});
