import { setupServer, SetupServerApi } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../../src";
import { ConnectionOptions } from "../../../src/types";
import { QUERY_URL } from "../../../src/common/api";
import { inMemoryCache } from "../../../src/common/tokenCache";
import stream from "node:stream";

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

const asyncQueryResponse = {
  message: "the query was accepted for async processing",
  monitorSql: "CALL fb_GetAsyncStatus('async_query_token');",
  token: "async_query_token"
};

// Helper function to setup mock server with auth
const setupMockServer = (server: SetupServerApi) => {
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
    )
  );
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

    setupMockServer(server);
    server.use(
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

  it("executes async query successfully", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    setupMockServer(server);
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(asyncQueryResponse));
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
    const asyncStatement = await connection.executeAsync("INSERT 1");
    expect(asyncStatement).toBeDefined();
    expect(asyncStatement.asyncQueryToken).toBe("async_query_token");
  });

  it("throws error for async SET statement", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });
    setupMockServer(server);

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      account: "my_account"
    };

    const connection = await firebolt.connect(connectionParams);
    await expect(
      connection.executeAsync("SET some_setting = 1")
    ).rejects.toThrow("SET statements cannot be executed asynchronously.");
  });

  const asyncQueryStatusTest = async (
    status: string,
    expectedRunning: boolean,
    expectedSuccessful: boolean | undefined
  ) => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    setupMockServer(server);
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        async (req, res, ctx) => {
          let result;
          const body = await req.text();
          if (
            body.includes("fb_GetAsyncStatus") &&
            body.includes("async_query_token")
          ) {
            result = ctx.json({
              meta: [
                { name: "status", type: "Text" },
                { name: "query_id", type: "Text" }
              ],
              data: [[status, "query_id_123"]],
              rows: 1
            });
          } else {
            result = ctx.json(asyncQueryResponse);
          }
          return res(result);
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
    const asyncStatement = await connection.executeAsync("INSERT 1");
    const isRunning = await connection.isAsyncQueryRunning(
      asyncStatement.asyncQueryToken
    );
    expect(isRunning).toBe(expectedRunning);
    const isSuccessful = await connection.isAsyncQuerySuccessful(
      asyncStatement.asyncQueryToken
    );
    expect(isSuccessful).toBe(expectedSuccessful);
  };

  it("checks status when async query is successful", async () => {
    await asyncQueryStatusTest("ENDED_SUCCESSFULLY", false, true);
  });

  it("checks status when async query is running", async () => {
    await asyncQueryStatusTest("RUNNING", true, undefined);
  });

  it("checks status when async query is failed", async () => {
    await asyncQueryStatusTest("ENDED_WITH_ERROR", false, false);
  });

  it("cancels async query correctly", async () => {
    let cancelQueryExecuted = false;
    const firebolt = Firebolt({
      apiEndpoint
    });

    setupMockServer(server);
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        async (req, res, ctx) => {
          const body = await req.text();
          const urlParams = Object.fromEntries(req.url.searchParams.entries());
          if (
            body.includes("fb_GetAsyncStatus") &&
            body.includes("async_query_token") &&
            urlParams["output_format"] === "JSON_Compact"
          ) {
            return res(
              ctx.json({
                meta: [
                  { name: "status", type: "Text" },
                  { name: "query_id", type: "Text" }
                ],
                data: [["RUNNING", "query_id_123"]],
                rows: 1
              })
            );
          } else if (
            body.includes("CANCEL QUERY") &&
            body.includes("query_id_123")
          ) {
            cancelQueryExecuted = true;
            return res(ctx.json({}));
          } else {
            return res(ctx.json(asyncQueryResponse));
          }
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
    const asyncStatement = await connection.executeAsync("INSERT 1");
    expect(asyncStatement.asyncQueryToken).not.toBe("");
    await connection.cancelAsyncQuery(asyncStatement.asyncQueryToken);
    await new Promise(resolve => setTimeout(resolve, 100)); // somehow we need it to wait for the flag switch
    expect(cancelQueryExecuted).toBe(true);
  });

  it("streaming works as expected", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });
    const jsonLines = [
      JSON.stringify({
        message_type: "START",
        result_columns: [
          {
            name: "?column?",
            type: "integer"
          }
        ]
      }),
      JSON.stringify({
        message_type: "DATA",
        data: [[1], [1]]
      }),
      JSON.stringify({
        message_type: "FINISH_SUCCESSFULLY"
      })
    ].join("\n");

    setupMockServer(server);
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        async (req, res, ctx) => {
          const body = await req.text();
          const urlParams = Object.fromEntries(req.url.searchParams.entries());
          if (
            body.includes("select") &&
            body.includes("generate_series") &&
            urlParams["output_format"] === "JSONLines_Compact"
          ) {
            return res(ctx.body(jsonLines));
          }
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
    const streamStatement = await connection.executeStream(
      "select 1 from generate_series(1, 2))"
    );
    let rowCount = 0;
    const { data } = await streamStatement.streamResult();
    data
      .on("meta", meta => {
        expect(meta).toEqual([
          {
            name: "?column?",
            type: "int"
          }
        ]);
      })
      .on("data", row => {
        expect(row).toEqual([1]);
        rowCount++;
      })
      .on("end", () => {
        expect(rowCount).toBe(2);
      });
  });

  it("streaming with normalization works as expected", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });
    const jsonLines = [
      JSON.stringify({
        message_type: "START",
        result_columns: [
          {
            name: "?column?",
            type: "integer"
          }
        ]
      }),
      JSON.stringify({
        message_type: "DATA",
        data: [[1], [1]]
      }),
      JSON.stringify({
        message_type: "FINISH_SUCCESSFULLY"
      })
    ].join("\n");

    setupMockServer(server);
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        async (req, res, ctx) => {
          const body = await req.text();
          const urlParams = Object.fromEntries(req.url.searchParams.entries());
          if (
            body.includes("select") &&
            body.includes("generate_series") &&
            urlParams["output_format"] === "JSONLines_Compact"
          ) {
            return res(ctx.body(jsonLines));
          }
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
    const streamStatement = await connection.executeStream(
      "select 1 from generate_series(1, 2))",
      {
        response: {
          normalizeData: true
        }
      }
    );
    let rowCount = 0;
    const { data } = await streamStatement.streamResult();
    data
      .on("meta", meta => {
        expect(meta).toEqual([
          {
            name: "?column?",
            type: "int"
          }
        ]);
      })
      .on("data", row => {
        expect(row).toEqual({ "?column?": 1 });
        rowCount++;
      })
      .on("end", () => {
        expect(rowCount).toBe(2);
      });
  });

  it("streaming fails with error", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });
    const jsonLines = [
      JSON.stringify({
        message_type: "START",
        result_columns: [
          {
            name: "?column?",
            type: "integer"
          }
        ]
      }),
      JSON.stringify({
        message_type: "FINISH_WITH_ERRORS",
        errors: [
          {
            description:
              "Line 1, Column 9: syntax error, unexpected identifier, expecting end of file select *1;",
            location: {
              failing_line: 1,
              start_offset: 9
            }
          }
        ]
      })
    ].join("\n");

    setupMockServer(server);
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        async (req, res, ctx) => {
          const body = await req.text();
          const urlParams = Object.fromEntries(req.url.searchParams.entries());
          if (
            body.includes("select *1;") &&
            urlParams["output_format"] === "JSONLines_Compact"
          ) {
            return res(ctx.body(jsonLines));
          }
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
    const streamStatement = await connection.executeStream("select *1;");
    const { data } = await streamStatement.streamResult();
    data
      .on("meta", meta => {
        expect(meta).toEqual([
          {
            name: "?column?",
            type: "int"
          }
        ]);
      })
      .on("data", () => {
        fail('"Data should not be emitted"');
      });
    const [error] = await stream.once(data, "error");
    expect(error.message).toEqual(
      "Result encountered an error: Line 1, Column 9: syntax error, unexpected identifier, expecting end of file select *1;"
    );
  });
});
