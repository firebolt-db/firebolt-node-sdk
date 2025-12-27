import { Firebolt, FireboltCore, OutputFormat } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("output formats", () => {
  it("uses JSON_COMPACT format by default", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1, 'a', 123.4");
    const { data, meta } = await statement.fetchResult();

    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(3);
    expect(meta[0].type).toEqual("int");
    expect(meta[1].type).toEqual("text");
    expect(meta[2].type).toEqual("double");
  });

  it("supports JSON_LINES format via streaming", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream("SELECT 1, 'a', 123.4");
    const { data } = await statement.streamResult();
    const rows: unknown[][] = [];

    await new Promise<void>(resolve => {
      data.on("data", row => {
        rows.push(row as unknown[]);
      });
      data.on("end", () => {
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0][0]).toEqual(1);
        expect(rows[0][1]).toEqual("a");
        expect(rows[0][2]).toEqual(123.4);
        resolve();
      });
    });
  });

  it("handles arrays with streaming format", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      "SELECT [1, 2, 3]::array(int), ['a', 'b']::array(text)"
    );
    const { data } = await statement.streamResult();
    const rows: unknown[][] = [];

    await new Promise<void>(resolve => {
      data.on("data", row => {
        rows.push(row as unknown[]);
      });
      data.on("end", () => {
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0][0]).toEqual([1, 2, 3]);
        expect(rows[0][1]).toEqual(["a", "b"]);
        resolve();
      });
    });
  });
});

