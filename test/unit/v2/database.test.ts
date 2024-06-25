import { setupServer } from "msw/node";
import { rest } from "msw";
import { QUERY_URL } from "../../../src/common/api";
import { Firebolt } from "../../../src";
import { ConnectionError, DeprecationError } from "../../../src/common/errors";
import { CreateDatabaseOptions } from "../../../src/service/database/types";
import { selectEngineResponse, selectEnginesResponse } from "./engine.test";

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

const selectOtherEngineResponse = {
  meta: [
    {
      name: "engine_name",
      type: "text"
    },
    {
      name: "url",
      type: "text"
    },
    {
      name: "status",
      type: "text"
    }
  ],
  data: [["some_other_engine", "https://some_other_engine.com", "Running"]],
  rows: 1
};

export const testCatalogResponse = {
  meta: [
    {
      name: "count(*)",
      type: "int"
    }
  ],
  data: [[1]],
  rows: 1
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
        const body = (String(req.body) ?? "").toLowerCase();
        if (body.includes("information_schema.tables")) {
          return res(ctx.json(testCatalogResponse));
        }
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
    server.use(
      // Query against system engine
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          const body = (String(req.body) ?? "").toLowerCase();
          if (
            body.includes("information_schema.engines") &&
            body.includes("some_engine")
          ) {
            return res(ctx.json(selectEngineResponse));
          } else if (
            body.includes("information_schema.engines") &&
            body.includes("some_other_engine")
          ) {
            return res(ctx.json(selectOtherEngineResponse));
          } else if (body.includes("information_schema.engines")) {
            return res(ctx.json(selectEnginesResponse));
          } else {
            return res(ctx.json(selectDbResponse));
          }
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

    const engine = await resourceManager.engine.create("some_engine");
    const options: CreateDatabaseOptions = {
      description: "description",
      attached_engines: [engine]
    };

    const db = await resourceManager.database.create("some_db", options);
    expect(db).toBeTruthy();
    expect(db.name).toEqual("some_db");
    const other_engine = await resourceManager.engine.create(
      "some_other_engine"
    );
    await resourceManager.engine.attachToDatabase(other_engine, db);
    const engines = await db.getAttachedEngines();
    expect(engines[0].endpoint).toEqual(engine.endpoint);
    expect(engines[1].endpoint).toEqual(other_engine.endpoint);
    try {
      await db.delete();
      expect(false).toBeTruthy();
    } catch (e) {
      expect(true).toBeTruthy();
    }
  });

  it("deprecated option throws error", async () => {
    server.use(
      // Query against system engine
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          return res(ctx.json(selectEnginesResponse));
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

    const engine = await resourceManager.engine.create("some_engine");
    const options: CreateDatabaseOptions = {
      description: "description",
      region: "us-east-1",
      attached_engines: [engine]
    };
    try {
      await resourceManager.database.create("some_db", options);
      expect(false).toBeTruthy(); // This line should not be reached
    } catch (e) {
      expect(e).toBeInstanceOf(DeprecationError);
    }
  });

  it("uses databases table if catalogs are not available in getByName", async () => {
    const testCatalogsEmptyResponse = {
      meta: [
        {
          name: "count(*)",
          type: "int"
        }
      ],
      data: [[0]],
      rows: 1
    };

    let databasesTableUsed = false;

    server.use(
      // Query against system engine
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          const body = (String(req.body) ?? "").toLowerCase();
          if (body.includes("information_schema.tables")) {
            return res(ctx.json(testCatalogsEmptyResponse));
          } else if (body.includes("information_schema.databases")) {
            databasesTableUsed = true;
            return res(ctx.json(selectDbResponse));
          }
          return res(ctx.json(selectDbResponse));
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
    const dbs = await resourceManager.database.getByName("name");

    expect(databasesTableUsed).toBeTruthy();
  });

  it("uses databases table if catalogs are not available in getAll", async () => {
    const testCatalogsEmptyResponse = {
      meta: [
        {
          name: "count(*)",
          type: "int"
        }
      ],
      data: [[0]],
      rows: 1
    };

    let databasesTableUsed = false;

    server.use(
      // Query against system engine
      rest.post(
        `https://some_system_engine.com/${QUERY_URL}`,
        (req, res, ctx) => {
          const body = (String(req.body) ?? "").toLowerCase();
          if (body.includes("information_schema.tables")) {
            return res(ctx.json(testCatalogsEmptyResponse));
          } else if (body.includes("information_schema.databases")) {
            databasesTableUsed = true;
            return res(ctx.json(selectDbsResponse));
          }
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

    expect(databasesTableUsed).toBeTruthy();
  });
});
