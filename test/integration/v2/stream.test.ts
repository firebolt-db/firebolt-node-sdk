import { Firebolt } from "../../../src";
import stream, { TransformCallback } from "node:stream";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(250000);

describe("streams", () => {
  it("check sum from stream result", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      `select 1 from generate_series(1, 2500000)` //~1 GB response
    );

    const { data } = await statement.streamResult();
    let sum = 0;
    const meta = await stream.once(data, "meta");
    console.log("Meta:", meta);

    data.on("data", row => {
      sum += row[0];
    });

    await new Promise(resolve => {
      data.on("end", () => {
        expect(sum).toEqual(2500000);
        resolve(null);
      });
    });
  });
  it("check normalized data", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      `select 1 from generate_series(1, 250000)`, //~1 GB response
      {
        response: {
          normalizeData: true
        }
      }
    );

    const { data } = await statement.streamResult();
    let sum = 0;

    data
      .on("meta", meta => {
        console.log("Meta:", meta);
      })
      .on("data", row => {
        sum += row["?column?"];
      });

    await new Promise(resolve => {
      data.on("end", () => {
        expect(sum).toEqual(250000);
        resolve(null);
      });
    });
  });
  it("stream transformers", async () => {
    class SerializeRowStream extends stream.Transform {
      public constructor() {
        super({
          objectMode: true,
          transform(
            row: any,
            encoding: BufferEncoding,
            callback: TransformCallback
          ) {
            const transformed = JSON.stringify(row);
            this.push(transformed);
            this.push("\n");
            callback();
          }
        });
      }
    }
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    const serializedStream = new SerializeRowStream();
    const statement = await connection.executeStream(
      "select * from generate_series(1, 10)"
    );

    const { data } = await statement.streamResult();
    data.pipe(serializedStream).pipe(process.stdout);

    await new Promise(resolve => {
      data.on("end", () => {
        resolve(null);
      });
    });
  });
  it("stream syntax error", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    try {
      await connection.executeStream("select *1;");
    } catch (error) {
      expect(error.message).toContain(
        "Line 1, Column 9: syntax error, unexpected integer, expecting end of file"
      );
      expect(error.message).toContain("select *1;");
    }
  });
  it("stream division by 0 error", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      "select 1/(i-100000) as a from generate_series(1,100000) as i"
    );

    const { data } = await statement.streamResult();
    data.on("meta", meta => {
      expect(meta).toEqual([
        {
          name: "a",
          type: "integer"
        }
      ]);
    });
    const [error] = await stream.once(data, "error");
    expect(error.message).toEqual(
      "Result encountered an error: Line 1, Column 9: Division by zero\n" +
        "select 1/(i-100000) as a from generate_series(1,...\n" +
        "        ^"
    );
  });
});
