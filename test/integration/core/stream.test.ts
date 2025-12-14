import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(10000);

describe("streams", () => {
  it("executes streaming query", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      "SELECT * FROM (VALUES (1), (2), (3)) AS t(value)"
    );

    const { data } = await statement.streamResult();
    const rows: number[] = [];

    data.on("data", row => {
      rows.push(row[0] as number);
    });

    await new Promise<void>(resolve => {
      data.on("end", () => {
        expect(rows.length).toEqual(3);
        expect(rows).toContain(1);
        expect(rows).toContain(2);
        expect(rows).toContain(3);
        resolve();
      });
    });
  });

  it("handles larger streaming result", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      "SELECT * FROM generate_series(1, 1000) AS t(value)"
    );

    const { data } = await statement.streamResult();
    let count = 0;

    data.on("data", () => {
      count++;
    });

    await new Promise<void>(resolve => {
      data.on("end", () => {
        expect(count).toEqual(1000);
        resolve();
      });
    });
  });
});

