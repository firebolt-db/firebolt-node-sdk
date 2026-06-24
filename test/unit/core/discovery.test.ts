import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt, OutputFormat } from "../../../src";
import { ConnectionOptions } from "../../../src/types";

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

describe("Connection discovery", () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("discovers the query endpoint and sends normalized query parameters", async () => {
    let discoveryCalled = false;
    let requestUrl = "";
    let receivedHeaders: Record<string, string> = {};

    server.use(
      rest.get(
        "http://localhost:3473/.well-known/firebolt",
        (req, res, ctx) => {
          discoveryCalled = true;
          return res(
            ctx.json({
              endpoints: {
                query: "/query?from_discovery=yes&database=wrong_db"
              },
              parameters: {
                engine: "wrong_engine",
                session: "discovered"
              }
            })
          );
        }
      ),
      rest.post("http://localhost:3473/query", (req, res, ctx) => {
        requestUrl = req.url.toString();
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
    const connectionParams: ConnectionOptions = {
      host: "localhost:3473",
      ssl_mode: "disable",
      database: "test_db",
      engine: "test_engine",
      settings: {
        output_format: OutputFormat.JSON,
        query_label: "node-sdk",
        internal: [{ test_setting: 1 }]
      }
    };

    const connection = await firebolt.connect(connectionParams);
    await connection.execute("SELECT 42");

    const url = new URL(requestUrl);
    expect(discoveryCalled).toBe(true);
    expect(url.searchParams.get("database")).toBe("test_db");
    expect(url.searchParams.get("engine")).toBe("test_engine");
    expect(url.searchParams.get("output_format")).toBe(OutputFormat.JSON);
    expect(url.searchParams.get("query_label")).toBe("node-sdk");
    expect(url.searchParams.get("test_setting")).toBe("1");
    expect(url.searchParams.get("from_discovery")).toBe("yes");
    expect(url.searchParams.get("session")).toBe("discovered");
    expect(receivedHeaders["authorization"]).toBeUndefined();
  });

  it("uses TLS for discovery when ssl_mode requires it", async () => {
    let discoveryCalled = false;
    let queryCalled = false;

    server.use(
      rest.get(
        "https://firebolt.example.com/.well-known/firebolt",
        (req, res, ctx) => {
          discoveryCalled = true;
          return res(
            ctx.json({
              query_url: "/query"
            })
          );
        }
      ),
      rest.post("https://firebolt.example.com/query", (req, res, ctx) => {
        queryCalled = true;
        return res(ctx.json(queryResponse));
      })
    );

    const firebolt = Firebolt();
    const connection = await firebolt.connect({
      host: "firebolt.example.com",
      ssl_mode: "require"
    });
    await connection.execute("SELECT 1");

    expect(discoveryCalled).toBe(true);
    expect(queryCalled).toBe(true);
  });
});
