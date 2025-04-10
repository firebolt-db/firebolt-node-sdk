import { Firebolt } from "../../../src";

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

    data
      .on("meta", meta => {
        console.log("Meta:", meta);
      })
      .on("data", row => {
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
});
