import { setupServer } from "msw/node";
import { rest } from "msw";
import { NodeHttpClient } from "../../../src/http/node";
import { Logger } from "../../../src/logger/node";
import { ResourceManager } from "../../../src/service";
import { QueryFormatter } from "../../../src/formatter";
import { Firebolt, FireboltResourceManager } from "../../../src";
import { Authenticator } from "../../../src/auth";
import {
  ACCOUNT_BINDINGS_URL,
  ACCOUNT_DATABASE,
  ACCOUNT_DATABASE_BINDING_URL,
  ACCOUNT_DATABASES,
  ACCOUNT_ENGINE,
  ACCOUNT_ENGINE_RESTART,
  ACCOUNT_ENGINE_START,
  ACCOUNT_ENGINE_STOP,
  ACCOUNT_ENGINES,
  ACCOUNT_INSTANCE_TYPES,
  ENGINES_BY_IDS_URL,
  REGIONS
} from "../../../src/common/api";

const apiEndpoint = "fake.api.com";
const logger = new Logger();
const engineObject = {
  id: {
    engine_id: "123",
    account_id: "some_account"
  },
  name: "some_engine",
  endpoint: "https://some_engine.com"
};

describe("engine service", () => {
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
    ),
    // Get engine id by name
    rest.get(
      `https://${apiEndpoint}/core/v1/accounts/some_account/engines:getIdByName`,
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
    )
  );
  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });

  it("gets engine by name", async () => {
    const firebolt = Firebolt({ apiEndpoint });
    const connection = await firebolt.connect({
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
      }
    });
    const resourceManager = FireboltResourceManager({
      apiEndpoint,
      connection
    });
    const engine = await resourceManager.engine.getByName("some_engine");
    expect(engine).toBeTruthy();
    expect(engine.endpoint).toEqual("https://some_engine.com");
  });
  it("starts engine", async () => {
    server.use(
      rest.post(
        `https://${apiEndpoint}/${ACCOUNT_ENGINE_START("some_account", "123")}`,
        (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({ engine: { name: "some_engine" } })
          );
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
      }
    });
    const engine = await firebolt.resourceManager.engine.getByName(
      "some_engine"
    );
    const {
      engine: { name: engine_name }
    } = await engine.start();
    expect(engine_name).toEqual("some_engine");
  });

  it("stops engine", async () => {
    server.use(
      rest.post(
        `https://${apiEndpoint}/${ACCOUNT_ENGINE_STOP("some_account", "123")}`,
        (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({ engine: { name: "some_engine" } })
          );
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
      }
    });
    const engine = await firebolt.resourceManager.engine.getByName(
      "some_engine"
    );
    const {
      engine: { name: engine_name }
    } = await engine.stop();
    expect(engine_name).toEqual("some_engine");
  });

  it("restarts engine", async () => {
    server.use(
      rest.post(
        `https://${apiEndpoint}/${ACCOUNT_ENGINE_RESTART(
          "some_account",
          "123"
        )}`,
        (req, res, ctx) => {
          return res(ctx.status(200), ctx.json({ engine: engineObject }));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
      }
    });
    const engine = await firebolt.resourceManager.engine.getByName(
      "some_engine"
    );
    const {
      engine: { name: engine_name }
    } = await engine.restart();
    expect(engine_name).toEqual("some_engine");
  });

  it("creates an engine", async () => {
    let lastInstanceType: { instance_type_id: string; region_id: string } = {
      instance_type_id: "",
      region_id: ""
    };
    server.use(
      // List regions
      rest.get(`https://${apiEndpoint}/${REGIONS}`, (req, res, ctx) => {
        return res(
          ctx.json({
            edges: [
              {
                node: { name: "region", id: { region_id: "123" } }
              }
            ]
          })
        );
      }),
      // List instance types
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_INSTANCE_TYPES("some_account")}`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              edges: [
                {
                  node: {
                    name: "instance_type",
                    id: {
                      instance_type_id: "123",
                      region_id: "123"
                    },
                    price_per_hour_cents: 1000
                  }
                },
                {
                  node: {
                    name: "cheap_instance_type",
                    id: {
                      instance_type_id: "456",
                      region_id: "123"
                    },
                    price_per_hour_cents: 1
                  }
                }
              ]
            })
          );
        }
      ),
      // Create engine
      rest.post(
        `https://${apiEndpoint}/${ACCOUNT_ENGINES("some_account")}`,
        async (req, res, ctx) => {
          lastInstanceType = (
            await req.json<{
              engine_revision: {
                specification: {
                  db_compute_instances_type_id: {
                    instance_type_id: string;
                    region_id: string;
                  };
                };
              };
            }>()
          ).engine_revision.specification.db_compute_instances_type_id;
          return res(ctx.json({ engine: engineObject }));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
      }
    });

    const engine = await firebolt.resourceManager.engine.create("some_engine", {
      region: "region",
      spec: "instance_type"
    });
    expect(engine).toBeTruthy();
    expect(lastInstanceType.instance_type_id).toEqual("123");

    const engine2 = await firebolt.resourceManager.engine.create(
      "some_engine",
      {
        region: "region"
      }
    );
    expect(engine2).toBeTruthy();
    expect(lastInstanceType.instance_type_id).toEqual("456");
  });

  it("deletes an engine", async () => {
    let deleteCalled = false;
    server.use(
      rest.delete(
        `https://${apiEndpoint}/${ACCOUNT_ENGINE("some_account", "123")}`,
        (req, res, ctx) => {
          deleteCalled = true;
          return res(ctx.json({}));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
      }
    });
    const engines = await firebolt.resourceManager.engine.getByName(
      "some_engine"
    );

    expect(deleteCalled).toEqual(false);
    await engines.delete();
    expect(deleteCalled).toEqual(true);
  });

  it("Gets engines by a database", async () => {
    server.use(
      // Get database id by name
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASES(
          "some_account"
        )}:getIdByName`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              database_id: {
                database_id: "123",
                account_id: "some_account"
              }
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
              database: {
                id: {
                  database_id: "123",
                  account_id: "some_account"
                },
                name: "some_database",
                description: "some_description"
              }
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
              edges: [
                { node: { id: { engine_id: "123" } } },
                { node: { id: { engine_id: "456" } } }
              ]
            })
          );
        }
      ),
      // Get engines by ids
      rest.post(
        `https://${apiEndpoint}/${ENGINES_BY_IDS_URL}`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              engines: [
                { ...engineObject, name: "123" },
                { ...engineObject, name: "456" }
              ]
            })
          );
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
      }
    });
    const engines = await firebolt.resourceManager.engine.getByDB(
      "some_database"
    );

    expect(engines.length).toEqual(2);
    expect(engines[0].name).toEqual("123");
    expect(engines[1].name).toEqual("456");
  });

  it("Attaches engine to a database", async () => {
    let attachCalled = false;
    server.use(
      // Get database id by name
      rest.get(
        `https://${apiEndpoint}/${ACCOUNT_DATABASES(
          "some_account"
        )}:getIdByName`,
        (req, res, ctx) => {
          return res(
            ctx.json({
              database_id: {
                database_id: "123",
                account_id: "some_account"
              }
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
              database: {
                id: {
                  database_id: "123",
                  account_id: "some_account"
                },
                name: "some_database",
                description: "some_description"
              }
            })
          );
        }
      ),
      // Attach engine to database
      rest.post(
        `https://${apiEndpoint}/${ACCOUNT_DATABASE_BINDING_URL(
          "some_account",
          "123",
          "123"
        )}`,
        (req, res, ctx) => {
          attachCalled = true;
          return res(ctx.json({}));
        }
      )
    );
    const firebolt = Firebolt({ apiEndpoint });
    await firebolt.connect({
      account: "my_account",
      auth: {
        username: "username",
        password: "password"
      }
    });

    expect(attachCalled).toEqual(false);
    await firebolt.resourceManager.engine.attachToDatabase(
      "some_engine",
      "some_database"
    );
    expect(attachCalled).toEqual(true);
  });
});
