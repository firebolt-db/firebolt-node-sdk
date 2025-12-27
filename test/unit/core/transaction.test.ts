import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt, FireboltCore } from "../../../src";
import { ConnectionOptions } from "../../../src/types";

const engineEndpoint = "http://localhost:3473";

const queryResponse = {
  meta: [
    {
      name: "result",
      type: "Int64"
    }
  ],
  data: [[1]],
  rows: 1
};

describe("Transaction Core", () => {
  const server = setupServer();
  const connectionParams: ConnectionOptions = {
    auth: FireboltCore(),
    database: "test_db",
    engineEndpoint
  };

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("executes BEGIN TRANSACTION query", async () => {
    let executedQueries: string[] = [];
    server.use(
      rest.post(engineEndpoint, async (req, res, ctx) => {
        const body = await req.text();
        executedQueries.push(body);
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await connection.begin();

    expect(executedQueries).toContain("BEGIN TRANSACTION");
  });

  it("executes COMMIT query", async () => {
    let executedQueries: string[] = [];
    server.use(
      rest.post(engineEndpoint, async (req, res, ctx) => {
        const body = await req.text();
        executedQueries.push(body);
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await connection.commit();

    expect(executedQueries).toContain("COMMIT");
  });

  it("executes ROLLBACK query", async () => {
    let executedQueries: string[] = [];
    server.use(
      rest.post(engineEndpoint, async (req, res, ctx) => {
        const body = await req.text();
        executedQueries.push(body);
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await connection.rollback();

    expect(executedQueries).toContain("ROLLBACK");
  });

  it("handles full transaction lifecycle", async () => {
    let executedQueries: string[] = [];
    server.use(
      rest.post(engineEndpoint, async (req, res, ctx) => {
        const body = await req.text();
        executedQueries.push(body);
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.begin();
    await connection.execute("INSERT INTO test_table VALUES (1)");
    await connection.commit();

    expect(executedQueries).toContain("BEGIN TRANSACTION");
    expect(executedQueries).toContain("INSERT INTO test_table VALUES (1)");
    expect(executedQueries).toContain("COMMIT");
  });

  it("handles rollback in transaction lifecycle", async () => {
    let executedQueries: string[] = [];
    server.use(
      rest.post(engineEndpoint, async (req, res, ctx) => {
        const body = await req.text();
        executedQueries.push(body);
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.begin();
    await connection.execute("INSERT INTO test_table VALUES (1)");
    await connection.rollback();

    expect(executedQueries).toContain("BEGIN TRANSACTION");
    expect(executedQueries).toContain("INSERT INTO test_table VALUES (1)");
    expect(executedQueries).toContain("ROLLBACK");
  });
});
