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
    expect(sum).toEqual(250000);
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
          type: "int"
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
  it("check data types", async () => {
    const seriesNum = 2;
    const generateLargeResultQuery = (rows: number) => `
      SELECT 
        i as id,
        'user_' || i::string as username,
        'email_' || i::string || '@example.com' as email,
        CASE WHEN i % 2 = 0 THEN 'active' ELSE 'inactive' END as status,
        CAST('100000000000000000' as BIGINT) as big_number,
        '2024-01-01'::date + (i % 365) as created_date,
        RANDOM() * 1000 as score,
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' as description
      FROM generate_series(1, ${rows}) as i
    `;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      generateLargeResultQuery(seriesNum),
      {
        response: {
          normalizeData: true
        }
      }
    );

    const { data } = await statement.streamResult();
    let rowCount = 0;
    // const meta = await stream.once(data, "meta");
    data.on("meta", meta => {
      console.log("Meta:", meta);
    });
    // console.log("Meta:", meta);
    // expect(meta).toEqual([
    //   { name: "id", type: "int" },
    //   { name: "username", type: "text" },
    //   { name: "email", type: "text" },
    //   { name: "status", type: "text" },
    //   { name: "big_number", type: "bigint" },
    //   { name: "created_date", type: "date" },
    //   { name: "score", type: "double precision" },
    //   { name: "description", type: "text" }
    // ]);

    data.on("data", row => {
      rowCount++;
      // Verify first row data types
      if (rowCount === 1) {
        expect(typeof row[0]).toBe("number"); // id
        expect(typeof row[1]).toBe("string"); // username
        expect(typeof row[2]).toBe("string"); // email
        expect(typeof row[3]).toBe("string"); // status
        expect(typeof row[4]).toBe("number"); // big_number (should be handled as number or BigNumber)
        expect(row[5]).toBeInstanceOf(Date); // created_date
        expect(typeof row[6]).toBe("number"); // score
        expect(typeof row[7]).toBe("string"); // description

        // Verify actual values for first row
        expect(row[0]).toBe(1);
        expect(row[1]).toBe("user_1");
        expect(row[2]).toBe("email_1@example.com");
        expect(row[3]).toBe("inactive"); // i=1, 1%2=1, so 'inactive'
        expect(row[4]).toBe(100000000000000000);
        expect(row[5]).toEqual(new Date("2024-01-02")); // 2024-01-01 + 1 day
        expect(typeof row[6]).toBe("number");
        expect(row[7]).toBe(
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        );
      }
    });

    await new Promise(resolve => {
      data.on("end", () => {
        expect(rowCount).toEqual(seriesNum);
        resolve(null);
      });
    });
  });
});
