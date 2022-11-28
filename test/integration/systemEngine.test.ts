import { Firebolt } from "../../src/index";

const connectionOptions = {
  username: process.env.FIREBOLT_USERNAME as string,
  password: process.env.FIREBOLT_PASSWORD as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(30000);

describe("system engine", () => {
  it("resolve engine endpoint", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionOptions,
      engineName: "system"
    });
    expect(connection.engineEndpoint).toMatch(/api/);
  });
  it("able to list engines", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionOptions,
      engineName: "system"
    });

    try {
      const statement = await connection.execute("show engines");
      const { data } = await statement.fetchResult();
    } catch (error) {
      console.log(error);
      expect(true).toEqual(false);
    }
  });
});
