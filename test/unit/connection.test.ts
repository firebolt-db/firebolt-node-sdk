import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../src/index";
import { ConnectionOptions } from "../../src/types";

const apiEndpoint = "fake.api.com";

const engineUrlResponse = {
  meta: [
    {
      name: "engine_url",
      type: "Text"
    },
    {
      name: "attached_to",
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
  data: [
    {
      engine_url: "https://some_engine.com",
      attached_to: "dummy",
      database_name: "dummy",
      status: "RUNNING"
    }
  ],
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
  data: [
    {
      attached_to: "dummy2"
    }
  ],
  rows: 1
};

describe("Connection", () => {
  const server = setupServer();

  server.use(
    rest.post(`https://id.app.firebolt.io/oauth/token`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token"
        })
      );
    }),
    rest.post(`https://some_system_engine.com`, (req, res, ctx) => {
      return res(ctx.json(engineUrlResponse));
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
    // not implemented yet
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
    engineUrlResponseOverride.data[0].attached_to = "dummy2";
    engineUrlResponseOverride.data[0].database_name = "dummy2";

    server.use(
      rest.post("https://some_engine.com", (req, res, ctx) => {
        callNum += 1;
        expect(req.url.toString()).toContain("database=dummy2");
        return res(ctx.status(200), ctx.json(selectOneResponse));
      }),
      rest.post(`https://some_system_engine.com`, (req, res, ctx) => {
        if (req.body?.startsWith("SELECT engs.engine_url, engs.attached_to")) {
          return res(ctx.json(engineUrlResponseOverride));
        } else {
          return res(ctx.json(selectAttachedToResponse));
        }
      })
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
      rest.post(`https://some_system_engine.com`, (req, res, ctx) => {
        if (req.body) {
          expect(req.url.toString()).not.toContain("database=");
          return res(ctx.json(selectOneResponse));
        } else {
          return res(ctx.json(engineUrlResponse));
        }
      })
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
      rest.post(`https://some_system_engine.com`, (req, res, ctx) => {
        if (req.body) {
          expect(req.url.toString()).toContain("database=my_db");
          return res(ctx.json(selectOneResponse));
        } else {
          return res(ctx.json(engineUrlResponse));
        }
      })
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
      rest.post(`https://some_system_engine.com`, (req, res, ctx) => {
        return res(ctx.json(engineUrlResponse));
      })
    );

    await expect(firebolt.connect(connectionParams)).rejects.toThrow(
      "Engine dummy is not attached to dummy_wrong."
    );
  });

  it("stopped engine", async () => {
    // Should it break?
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
    stoppedEngineResponse.data[0].status = "STOPPED";

    server.use(
      rest.post("https://some_system_engine.com", (req, res, ctx) => {
        return res(ctx.json(stoppedEngineResponse));
      })
    );

    await expect(firebolt.connect(connectionParams)).rejects.toThrow(
      "Engine dummy is not running"
    );
  });
});
