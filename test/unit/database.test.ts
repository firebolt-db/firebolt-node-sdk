import { setupServer } from "msw/node";
import { rest } from "msw";
import { QUERY_URL } from "../../src/common/api";
import { Firebolt } from "../../src";
import { ConnectionError, DeprecationError } from "../../src/common/errors";

const apiEndpoint = "api.fake.firebolt.io";

const selectDbResponse = {
  meta: [
    {
      name: "name",
      type: "text"
    },
    {
      name: "description",
      type: "text"
    }
  ],
  data: [["some_db", "My description"]],
  rows: 1
};

const selectDbsResponse = {
  meta: [
    {
      name: "name",
      type: "text"
    },
    {
      name: "description",
      type: "text"
    }
  ],
  data: [
    ["some_db", "My description"],
    ["some_other_db", "My description"]
  ],
  rows: 2
};

describe("database service", () => {
  const server = setupServer();

  server.use(
    // Auth
    rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token"
        })
      );
    }),
    // Resolve account name
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
    // Resolve system engine URL
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
    // Query against system engine
    rest.post(
      `https://some_system_engine.com/${QUERY_URL}`,
      (req, res, ctx) => {
        return res(ctx.json(selectDbResponse));
      }
    )
  );

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });

  it("gets db by name", async () => {
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const db = await resourceManager.database.getByName("some_db");
    expect(db).toBeTruthy();
    expect(db.name).toEqual("some_db");
  });

  it("get not accessible db", async () => {
    const selectNoResponse = {
      meta: [
        {
          name: "name",
          type: "text"
        },
        {
          name: "description",
          type: "text"
        }
      ],
      data: [],
      rows: 0
    };
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(selectNoResponse));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    expect(resourceManager.database.getByName("some_db")).rejects.toThrowError(
      ConnectionError
    );
  });

  it("gets all dbs", async () => {
    server.use(
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(selectDbsResponse));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const dbs = await resourceManager.database.getAll();
    expect(dbs).toBeTruthy();
    expect(dbs[0].name).toEqual("some_db");
    expect(dbs[1].name).toEqual("some_other_db");
  });

  it("deprecated methods", async () => {
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    expect(
      resourceManager.database.getDefaultEndpointByName("dummy")
    ).rejects.toThrowError(DeprecationError);
    expect(resourceManager.database.getById("111")).rejects.toThrowError(
      DeprecationError
    );
  });

  it("create and delete database", async () => {
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        client_id: "id",
        client_secret: "secret"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const db = await resourceManager.database.create("some_db");
    expect(db).toBeTruthy();
    expect(db.name).toEqual("some_db");
    await db.delete();
    expect(resourceManager.database.getByName("some_db")).rejects.toThrowError(ConnectionError);
  });
});
