import { Firebolt } from "../../src/index";

const connectionOptions = {
  username: process.env.FIREBOLT_USERNAME as string,
  password: process.env.FIREBOLT_PASSWORD as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(1000000);

describe("system engine", () => {
  const engineName = connectionOptions.engineName + "_system_test";
  const databaseName = process.env.FIREBOLT_DATABASE + "_system_test";

  beforeAll(async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionOptions,
      engineName: "system"
    });

    try {
      await connection.execute(`create database if not exists ${databaseName}`);

      await connection.execute(
        `create engine if not exists ${engineName} with REGION = 'us-east-1' SPEC = 'B1' SCALE = 1`
      );

      await connection.execute(
        `attach engine ${engineName} to ${databaseName}`
      );
    } catch (error) {
      console.log(error);
      expect(true).toEqual(false);
    }
  });

  afterAll(async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionOptions,
      engineName: "system"
    });

    try {
      // await connection.execute(`drop engine if exists ${engineName}`);
      // await connection.execute(`drop database if exists ${databaseName}`);
    } catch (error) {
      console.log(error);
      expect(true).toEqual(false);
    }
  });

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
      const engine = (data as unknown[][]).find(row => row[0] === engineName);
      expect(engine).toBeTruthy();
    } catch (error) {
      console.log(error);
      expect(true).toEqual(false);
    }
  });
  it("able to list databases", async () => {
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
      const database = (data as unknown[][]).find(
        row => row[0] === databaseName
      );
      expect(database).toBeTruthy();
    } catch (error) {
      console.log(error);
      expect(true).toEqual(false);
    }
  });
  it("start/stop engine", async () => {
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
