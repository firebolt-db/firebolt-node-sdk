import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(100000);

const dml = `
CREATE FACT TABLE IF NOT EXISTS t1
(
id INT  NOT NULL UNIQUE,
description TEXT NULL,
pg_date pgdate NOT NULL ,
time_wtz timestamptz NOT NULL ,
time_ntz timestampntz NOT NULL ,
done boolean NOT NULL default 1
)
PRIMARY INDEX id;
`;

const insertValues = `
INSERT INTO t1 VALUES
(1, 'fitst value', '0001-01-01', '0001-01-01 00:00:00.000000 UTC', '0001-01-01 00:00:00.000000', TRUE),
(2, 'second value', '0301-05-08', '0342-01-12 15:16:00.000000 UTC', '0343-12-01 12:14:00.000000', TRUE),
(3, 'thirds value', '1500-12-10', '1479-01-01 00:00:00.000000 UTC', '1562-01-11 00:00:22.000000', TRUE),
(4, 'some value', '1890-12-10', '1889-06-01 00:21:12.000000 UTC', '1990-04-22 22:12:00.000000', TRUE),
(5, 'some second value', '1912-11-01', '1905-09-12 13:00:12.000000 UTC', '1919-01-01 02:22:41.123221', TRUE),
(6, 'just a value', '1980-01-23', '1977-11-01 11:11:00.000000 UTC', '1985-12-24 23:22:00.000000', TRUE),
(7, 'my value', '1989-06-24', '1989-06-24 06:24:24.000000 UTC', '1989-06-24 23:24:24.000000', TRUE),
(8, null, '1991-06-13', '1991-06-13 00:00:00.000000 UTC', '1991-06-13 23:59:00.000000', TRUE),
(9, null, '2022-05-15', '2022-05-15 14:28:00.000000 UTC', '2022-05-15 14:28:00.000000', TRUE),
(10, 'last value', '9999-12-31', '9999-01-01 00:00:00.000000 UTC', '9999-12-31 23:59:00.000000', TRUE)
`;

describe("new date data format", () => {
  afterAll(async () => {
    try {
      const firebolt = Firebolt({
        apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
      });
      const connection = await firebolt.connect(connectionParams);
      await connection.execute(`drop table if exists t1`);
    } catch (e) {
      console.log(e);
    }
  });

  it("works", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    await connection.execute(dml);
    await connection.execute(insertValues);
    const statement = await connection.execute(`select * from t1 limit 10`);
    const { data, meta } = await statement.fetchResult();
    expect(meta[2].type).toEqual("date"); // PGDate is aliased as date
    expect(meta[3].type).toEqual("timestamptz");
    expect(meta[4].type).toEqual("timestamp"); // TimestampNtz is aliased as timestamp
  });
});
