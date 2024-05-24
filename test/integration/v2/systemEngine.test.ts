import { Firebolt } from "../../../src/index";

const connectionOptions = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT_V1 as string,
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
      ...connectionOptions
    });

    await connection
      .execute(`drop engine if exists ${engineName}`)
      .catch(error => {
        console.log(error);
      });

    await connection
      .execute(`drop database if exists ${databaseName}`)
      .catch(error => {
        console.log(error);
      });
    try {
      await connection.execute(`create database if not exists ${databaseName}`);

      const acc_version = (await connection.resolveAccountInfo()).infraVersion;

      if (acc_version === 1) {
        await connection.execute(
          `create engine if not exists ${engineName} with SPEC = 'B1' SCALE = 1`
        );
        await connection.execute(
          `attach engine ${engineName} to ${databaseName}`
        );
      } else {
        await connection.execute(
          `create engine if not exists ${engineName} with TYPE=S NODES=1`
        );
      }
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
      ...connectionOptions
    });

    try {
      await connection.execute(`stop engine ${engineName}`);
      await connection.execute(`drop engine if exists ${engineName}`);
      await connection.execute(`drop database if exists ${databaseName}`);
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
      ...connectionOptions
    });
    expect(connection.engineEndpoint).toBeTruthy();
  });
  it("able to list engines", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionOptions
    });

    try {
      const statement = await connection.execute(
        "SELECT * FROM information_schema.engines"
      );
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
      ...connectionOptions
    });

    try {
      const statement = await connection.execute(
        "SELECT * FROM information_schema.databases"
      );
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
  it.skip("start/stop engine", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionOptions
    });

    try {
      await connection.execute(`start engine ${engineName}`);
      await connection.execute(`stop engine ${engineName}`);
    } catch (error) {
      console.log(error);
      expect(true).toEqual(false);
    }
  });
});
