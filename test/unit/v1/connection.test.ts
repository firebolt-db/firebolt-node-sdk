import { setupServer, SetupServerApi } from "msw/node";
import { rest } from "msw";
import { ConnectionOptions, Firebolt } from "../../../src";

const apiEndpoint = "fake.api.com";

const engineObject = {
  id: {
    engine_id: "123",
    account_id: "some_account"
  },
  name: "some_engine",
  endpoint: "https://some_engine.com"
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

const defaultAccountResponse = {
  account: {
    id: "some_other_account",
    name: "some_other_account_name",
    title: "some_other_account_name"
  }
};

function resetServerHandlers(server: SetupServerApi) {
  server.use(
    // Authentication
    rest.post(`https://${apiEndpoint}/auth/v1/login`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token",
          refresh_token: "fake_refresh_token"
        })
      );
    }),
    // Get account id
    rest.get(
      `https://${apiEndpoint}/iam/v2/accounts:getIdByName`,
      (req, res, ctx) => {
        return res(
          ctx.json({
            account_id: "some_account"
          })
        );
      }
    ),
    // Get default account
    rest.get(`https://${apiEndpoint}/iam/v2/account`, (req, res, ctx) => {
      return res(ctx.json(defaultAccountResponse));
    }),
    // Get engine id by name
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines:getIdByName`,
      (req, res, ctx) => {
        return res(ctx.json({ engine_id: engineObject.id }));
      }
    ),
    // Default account engine id by name
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_other_account/engines:getIdByName`,
      (req, res, ctx) => {
        return res(ctx.json({ engine_id: engineObject.id }));
      }
    ),
    // Get engine by id
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines/123`,
      (req, res, ctx) => {
        return res(ctx.json({ engine: engineObject }));
      }
    ),
    // Default get engine by id
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_other_account/engines/123`,
      (req, res, ctx) => {
        return res(ctx.json({ engine: engineObject }));
      }
    ),
    // Respond to select 1
    rest.post(`https://some_engine.com/`, (req, res, ctx) => {
      return res(ctx.json(selectOneResponse));
    })
  );
}

describe("Connection v1", () => {
  const server = setupServer();
  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });
  beforeEach(() => {
    resetServerHandlers(server);
  });

  it("Can connect", async () => {
    const firebolt = Firebolt({ apiEndpoint });

    const connectionParams: ConnectionOptions = {
      auth: {
        username: "user",
        password: "pass"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };

    const connection = await firebolt.connect(connectionParams);
    await connection.execute("SELECT 1");
    expect(connection.engineEndpoint).toBe(engineObject.endpoint);
    const account_info = await connection.resolveAccountInfo();
    expect(account_info.id).toBe("some_account");
    expect(account_info.infraVersion).toBe(1);
  });
  it("Can run set statements", async () => {
    const param = "my_var";
    const value = "1";
    server.use(
      // Verify that the parameter is set when querying the engine
      rest.post(`https://some_engine.com/`, (req, res, ctx) => {
        const myParam = req.url.searchParams.get(param);
        expect(myParam).toBe(value);
        return res(ctx.json(selectOneResponse));
      })
    );

    const firebolt = Firebolt({ apiEndpoint });
    const connectionParams: ConnectionOptions = {
      auth: {
        username: "user",
        password: "pass"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };

    const connection = await firebolt.connect(connectionParams);
    await connection.execute(`SET ${param} = ${value}`);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toBe(1);
  });
  it("Incorrect set statements don't get saved", async () => {
    const param = "my_var";
    const value = "1";
    let param_checked = false;
    server.use(
      // Verify that the parameter is not set when querying the engine
      rest.post(`https://some_engine.com/`, (req, res, ctx) => {
        if (
          req.body == "SELECT 1" &&
          req.url.searchParams.get(param)?.toString() == value
        ) {
          return res(ctx.status(404));
        }
        if (req.body == "SELECT 2") {
          expect(req.url.searchParams.get(param)).toBe(null);
          param_checked = true;
        }
        return res(ctx.json(selectOneResponse));
      })
    );

    const firebolt = Firebolt({ apiEndpoint });
    const connectionParams: ConnectionOptions = {
      auth: {
        username: "user",
        password: "pass"
      },
      database: "dummy",
      engineName: "dummy",
      account: "my_account"
    };

    const connection = await firebolt.connect(connectionParams);
    await expect(
      connection.execute(`SET ${param} = ${value}`)
    ).rejects.toThrow();
    const statement = await connection.execute("SELECT 2");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toBeDefined();
    expect(param_checked).toBe(true);
  });
  it("Can connect without account", async () => {
    let other_account_used = false;
    server.use(
      // Verify that some_other_account was used
      rest.get(
        `https://${apiEndpoint}/core/v1/accounts/some_other_account/engines/123`,
        (req, res, ctx) => {
          other_account_used = true;
          return res(ctx.json({ engine: engineObject }));
        }
      )
    );
    const firebolt = Firebolt({
      apiEndpoint
    });

    const connectionParams: ConnectionOptions = {
      auth: {
        username: "user",
        password: "pass"
      },
      database: "dummy",
      engineName: "dummy"
    };

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();
    const record = data[0] as Record<string, string>;
    expect(record.one).toBe(1);
    expect(other_account_used).toBe(true);
  });
});
