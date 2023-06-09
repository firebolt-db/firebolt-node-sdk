import stream, { TransformCallback } from "stream";
import { Firebolt } from "../../src/index";

const connectionParams = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(20000);

describe("streams", () => {
  it("stream transformters", async () => {
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

    const serializedStream = new SerializeRowStream();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("select 1 union all select 2");

    const { data } = await statement.streamResult();

    data.pipe(serializedStream).pipe(process.stdout);

    await new Promise(resolve => {
      data.on("end", () => {
        resolve(null);
      });
    });
  });

  it("parses body without meta and data", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(`
DROP TABLE IF EXISTS ex_stream;

CREATE DIMENSION TABLE IF NOT EXISTS ex_stream (
  json_data TEXT NOT NULL,
  partition_timestamp TIMESTAMP NOT NULL,
  source_file_name TEXT NOT NULL,
  source_file_timestamp TIMESTAMP NOT NULL
) PRIMARY INDEX partition_timestamp, source_file_name;
`);

    const {
      data,
      meta: metaPromise,
      statistics: statisticsPromise
    } = await statement.streamResult();

    data.pipe(process.stdout);

    const metadata = await metaPromise;
    const statistics = await statisticsPromise;
    expect(metadata).toEqual([]);
    expect(statistics).toEqual(null);
  });
});
