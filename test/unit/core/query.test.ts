import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt, FireboltCore, OutputFormat } from "../../../src";
import { ConnectionOptions } from "../../../src/types";

const engineEndpoint = "http://localhost:3473";

const queryResponse = {
  meta: [
    {
      name: "result",
      type: "Int64"
    }
  ],
  data: [[42]],
  rows: 1
};

const multiRowResponse = {
  meta: [
    {
      name: "value",
      type: "Text"
    }
  ],
  data: [["a"], ["b"], ["c"]],
  rows: 3
};

describe("Connection Core HTTP", () => {
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

  it("executes a simple query", async () => {
    server.use(
      rest.post(`http://localhost:3473`, (req, res, ctx) => {
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 42");
    const result = await statement.fetchResult();

    expect(result.data).toEqual([[42]]);
    expect(result.data.length).toBe(1);
  });

  it("executes a query with parameters", async () => {
    let requestBody = "";
    server.use(
      rest.post(`http://localhost:3473`, async (req, res, ctx) => {
        requestBody = await req.text();
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    const statement =await connection.execute("SELECT ?", { parameters: [42] });
    const result = await statement.fetchResult();

    expect(result.data).toEqual([[42]]);
    expect(result.data.length).toBe(1);
    // Verify the query body contains the parameter value
    expect(requestBody).toContain("42");
  });

  it("handles multiple rows", async () => {
    server.use(
      rest.post(`http://localhost:3473`, (req, res, ctx) => {
        return res(ctx.json(multiRowResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 'a' UNION ALL SELECT 'b' UNION ALL SELECT 'c'");
    const result = await statement.fetchResult();

    expect(result.data).toEqual([["a"], ["b"], ["c"]]);
    expect(result.data.length).toBe(3);
  });

  it("handles query errors", async () => {
    server.use(
      rest.post(`http://localhost:3473`, (req, res, ctx) => {
        return res(
          ctx.status(400),
          ctx.json({
            error: {
              message: "Syntax error",
              code: "SYNTAX_ERROR"
            }
          })
        );
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await expect(connection.execute("INVALID SQL")).rejects.toThrow();
  });

  it("sends database parameter in query string", async () => {
    let requestUrl = "";
    server.use(
      rest.post(`http://localhost:3473`, (req, res, ctx) => {
        requestUrl = req.url.toString();
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const customConnectionParams: ConnectionOptions = {
      ...connectionParams,
      database: "my_database"
    };
    const connection = await firebolt.connect(customConnectionParams);
    await connection.execute("SELECT 1");

    // Parse URL and verify database parameter is set correctly
    const url = new URL(requestUrl);
    expect(url.searchParams.get("database")).toBe("my_database");
  });

  it("sends output_format parameter", async () => {
    let requestUrl = "";
    server.use(
      rest.post(`http://localhost:3473`, (req, res, ctx) => {
        requestUrl = req.url.toString();
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    // Use a format that Core supports
    await connection.execute("SELECT 1", {
      settings: { output_format: OutputFormat.JSON_LINES }
    });

    // Parse URL and verify output_format parameter is set correctly
    const url = new URL(requestUrl);
    expect(url.searchParams.get("output_format")).toBe("JSONLines_Compact");
  });

  it("does not send authorization header", async () => {
    let receivedHeaders: Record<string, string> = {};
    server.use(
      rest.post(`http://localhost:3473`, (req, res, ctx) => {
        receivedHeaders = Object.fromEntries(
          Object.entries(req.headers.all()).map(([key, value]) => [
            key.toLowerCase(),
            Array.isArray(value) ? value[0] : value
          ])
        );
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await connection.execute("SELECT 1");

    expect(receivedHeaders["authorization"]).toBeUndefined();
  });

  it("handles streaming queries", async () => {
    const jsonLines = [
      JSON.stringify({
        message_type: "START",
        result_columns: [
          {
            name: "value",
            type: "text"
          }
        ]
      }),
      JSON.stringify({
        message_type: "DATA",
        data: [["a"]]
      }),
      JSON.stringify({
        message_type: "DATA",
        data: [["b"]]
      }),
      JSON.stringify({
        message_type: "DATA",
        data: [["c"]]
      }),
      JSON.stringify({
        message_type: "FINISH_SUCCESSFULLY"
      })
    ].join("\n");

    server.use(
      rest.post(`http://localhost:3473`, (req, res, ctx) => {
        const urlParams = Object.fromEntries(req.url.searchParams.entries());
        if (urlParams["output_format"] === "JSONLines_Compact") {
          return res(
            ctx.set("Content-Type", "application/x-ndjson"),
            ctx.body(jsonLines)
          );
        }
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    const streamStatement = await connection.executeStream("SELECT 'a' UNION ALL SELECT 'b' UNION ALL SELECT 'c'");
    
    const rows: string[] = [];
    const { data } = await streamStatement.streamResult();
    
    await new Promise<void>(resolve => {
      data
        .on("data", row => {
          rows.push(row[0] as string);
        })
        .on("end", () => {
          expect(rows.length).toBe(3);
          expect(rows).toContain("a");
          expect(rows).toContain("b");
          expect(rows).toContain("c");
          resolve();
        });
    });
  });

});

