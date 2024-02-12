import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(100000);

describe("inf and nan values parsing", () => {
  it("inf and nan values are parsed correctly", async () => {
    const query = `SELECT 'inf'::float, '-inf'::float, 'nan'::float, '-nan'::float`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(query);

    const { data } = await statement.fetchResult();

    expect(data[0][0]).toBe(Infinity);
    expect(data[0][1]).toBe(-Infinity);
    expect(isNaN(data[0][2])).toBe(true);
    expect(isNaN(data[0][3])).toBe(true);
  });
});
