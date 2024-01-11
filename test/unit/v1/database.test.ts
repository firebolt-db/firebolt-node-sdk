import { setupServer } from "msw/node";
import { rest } from "msw";
import {
  ACCOUNT_BINDINGS_URL,
  ACCOUNT_DATABASE,
  ACCOUNT_DATABASE_BINDING_URL,
  ACCOUNT_DATABASES,
  ACCOUNT_ENGINE_URL_BY_DATABASE_NAME,
  ACCOUNT_ENGINES,
  QUERY_URL,
  REGIONS
} from "../../../src/common/api";
import { Firebolt } from "../../../src";
import { ConnectionError, DeprecationError } from "../../../src/common/errors";
import { CreateDatabaseOptions } from "../../../src/service/database/types";

const apiEndpoint = "api.fake.firebolt.io";

const dbObject = {
  id: {
    database_id: "123",
    account_id: "some_account"
  },
  name: "some_database",
  description: "some_description"
};

describe("database service", () => {
  const server = setupServer();

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
    )
  );

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });

  it("gets db by name", async () => {
    server.use(
      // Get database id by name
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASES(
          "some_account"
        )}:getIdByName`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              database_id: dbObject.id
            })
          );
        }
      ),
      // Get database by id
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASE("some_account", "123")}`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              database: dbObject
            })
          );
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      engineEndpoint: "engine.firebolt.io",
      auth: {
        username: "user@firebolt.io",
        password: "password"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const db = await resourceManager.database.getByName("some_database");
    expect(db).toBeTruthy();
    expect(db.name).toEqual("some_database");
  });

  it("gets all dbs", async () => {
    let first_page_fetched = false;
    server.use(
      // Get all databases
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASES("some_account")}`,
        (req, res, ctx) => {
          const has_next_page = !first_page_fetched;
          first_page_fetched = true;
          return res(
            ctx.json({
              edges: [
                {
                  node: {
                    ...dbObject,
                    name: has_next_page ? "some_database" : "some_other_db"
                  }
                }
              ],
              page: {
                has_next_page: has_next_page
              }
            })
          );
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      engineEndpoint: "engine.firebolt.io",
      auth: {
        username: "user@firebolt.io",
        password: "password"
      }
    });
    const resourceManager = firebolt.resourceManager;
    const dbs = await resourceManager.database.getAll();
    expect(dbs).toBeTruthy();
    expect(dbs[0].name).toEqual("some_database");
    expect(dbs[1].name).toEqual("some_other_db");
  });

  it("create and delete database", async () => {
    let engineAttached = false;
    let dbDeleted = false;
    server.use(
      // Get engine by id
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_ENGINES("some_account")}:getIdByName`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              engine_id: {
                engine_id: "456",
                account_id: "some_account"
              }
            })
          );
        }
      ),
      // Create database
      rest.post(
        `https://${apiEndpoint}/${ACCOUNT_DATABASES("some_account")}`,
        (req, res, ctx) => {
          return res(ctx.json({ database: dbObject }));
        }
      ),
      // Delete database
      rest.delete(
        `https://${apiEndpoint}/${ACCOUNT_DATABASE("some_account", "123")}`,
        (req, res, ctx) => {
          dbDeleted = true;
          return res(ctx.json({}));
        }
      ),
      // Attach engine
      rest.post(
        `https://${apiEndpoint}/${ACCOUNT_DATABASE_BINDING_URL(
          "some_account",
          "123",
          "456"
        )}`,
        (req, res, ctx) => {
          engineAttached = true;
          return res(ctx.json({}));
        }
      ),
      // List regions
      rest.get(`https://${apiEndpoint}/${REGIONS}`, (req, res, ctx) => {
        return res(ctx.json({ edges: [{ node: { name: "region" }, id: {} }] }));
      })
    );

    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      engineEndpoint: "engine.firebolt.io",
      auth: {
        username: "user@firebolt.io",
        password: "password"
      }
    });
    const resourceManager = firebolt.resourceManager;

    const options: CreateDatabaseOptions = {
      description: "description",
      region: "region",
      attached_engines: ["some_engine"]
    };

    const db = await resourceManager.database.create("some_database", options);
    expect(db).toBeTruthy();
    expect(db.name).toEqual("some_database");
    expect(engineAttached).toBeTruthy();
    expect(dbDeleted).toBeFalsy();
    await db.delete();
    expect(dbDeleted).toBeTruthy();
  });

  it("gets default endpoint", async () => {
    server.use(
      // Get database id by name
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASES(
          "some_account"
        )}:getIdByName`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              database_id: dbObject.id
            })
          );
        }
      ),
      // Get database
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASE("some_account", "123")}`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              database: dbObject
            })
          );
        }
      ),
      // Get default endpoint
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_ENGINE_URL_BY_DATABASE_NAME(
          "some_account"
        )}`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              engine_url: "https://some_account.engine.firebolt.io"
            })
          );
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      engineEndpoint: "engine.firebolt.io",
      auth: {
        username: "user@firebolt.io",
        password: "password"
      }
    });
    const resourceManager = firebolt.resourceManager;

    const db = await resourceManager.database.getByName("some_database");
    expect(db).toBeTruthy();

    const endpoint = await db.getDefaultEndpoint();
    expect(endpoint).toEqual("https://some_account.engine.firebolt.io");
  });

  it("gets attached engines for a database", async () => {
    server.use(
      // Get database id by name
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASES(
          "some_account"
        )}:getIdByName`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              database_id: dbObject.id
            })
          );
        }
      ),
      // Get database
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASE("some_account", "123")}`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              database: dbObject
            })
          );
        }
      ),
      // Get attached engines
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_BINDINGS_URL("some_account")}`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              edges: []
            })
          );
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      engineEndpoint: "engine.firebolt.io",
      auth: {
        username: "user@firebolt.io",
        password: "password"
      }
    });
    const resourceManager = firebolt.resourceManager;

    const db = await resourceManager.database.getByName("some_database");
    expect(db).toBeTruthy();

    const engines = await db.getAttachedEngines();
    expect(engines).toHaveLength(0);
  });
});
