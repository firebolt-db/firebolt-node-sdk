import stream, { TransformCallback } from "stream";
import { Firebolt } from "../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
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
});
