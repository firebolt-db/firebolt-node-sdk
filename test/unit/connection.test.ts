import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../src";
import { ConnectionOptions } from "../../src/types";
import { QUERY_URL } from "../../src/common/api";

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
});
