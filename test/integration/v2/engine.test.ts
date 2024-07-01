import {
  EngineStatusSummary,
  Firebolt,
  FireboltResourceManager
} from "../../../src/index";
import { CreateEngineOptions } from "../../../src/service/engine/types";
import { DatabaseService } from "../../../src/service/database";

const authOptions = {
  client_id: process.env.FIREBOLT_CLIENT_ID as string,
  client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
};

const connectionOptionsV2 = {
  auth: authOptions,
  account: process.env.FIREBOLT_ACCOUNT_V2 as string
};

const createDatabaseOptionsV2 = {
  description: "test description",
  failIfExists: false
};

const createEngineOptionsV2 = {
  spec: "S",
  scale: 1,
  auto_stop: 20 * 60,
  fail_if_exists: true
};

jest.setTimeout(600000); // 10 minutes

describe.each([
  ["v2", connectionOptionsV2, createDatabaseOptionsV2, createEngineOptionsV2]
])(
  "engine integration for account %s",
  (_, connectionOptions, createDatabaseOptions, createEngineOptions) => {
    it.skip(
      "stops engine",
      async () => {
        const firebolt = Firebolt({
          apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
        });

        await firebolt.connect(connectionOptions);

        const engine = await firebolt.resourceManager.engine.getByName(
          process.env.FIREBOLT_ENGINE_NAME as string
        );

        expect(engine?.current_status_summary).toEqual(
          EngineStatusSummary.RUNNING
        );

        await engine.stop();

        expect(engine?.current_status_summary).toEqual(
          EngineStatusSummary.STOPPED
        );
      },
      10 * 60 * 1000
    );
    it.skip(
      "starts engine and waits for it to be ready",
      async () => {
        const firebolt = Firebolt({
          apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
        });

        await firebolt.connect(connectionOptions);

        const engine = await firebolt.resourceManager.engine.getByName(
          process.env.FIREBOLT_ENGINE_NAME as string
        );

        expect(engine?.current_status_summary).toEqual(
          EngineStatusSummary.STOPPED
        );

        await engine.startAndWait();

        expect(engine?.current_status_summary).toEqual(
          EngineStatusSummary.RUNNING
        );
      },
      10 * 60 * 1000
    );
    it("resolve default engine endpoint if not provided", async () => {
      const firebolt = Firebolt({
        apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
      });

      const connection = await firebolt.connect({
        auth: {
          client_id: process.env.FIREBOLT_CLIENT_ID as string,
          client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
        },
        account: process.env.FIREBOLT_ACCOUNT_V1 as string,
        database: process.env.FIREBOLT_DATABASE as string
      });

      expect(connection.engineEndpoint).not.toEqual(
        process.env.FIREBOLT_ENGINE_ENDPOINT // Should be system engine, not user
      );
    });
    it("create attach delete engine and database", async () => {
      const firebolt = Firebolt({
        apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
      });

      const connection = await firebolt.connect(connectionOptions);
      const name = `${process.env.FIREBOLT_DATABASE}_create_delete`;

      const database = await firebolt.resourceManager.database.create(
        name,
        createDatabaseOptions
      );
      expect(database.name == name);

      const engine = await firebolt.resourceManager.engine.create(
        name,
        createEngineOptions
      );
      expect(engine.name == name);

      const accountId = (await connection.resolveAccountInfo()).infraVersion;
      await firebolt.resourceManager.engine.attachToDatabase(engine, database);
      const attached_engines = await database.getAttachedEngines();
      expect(attached_engines.includes(engine));

      try {
        await engine.stop();
      } catch (e) {
        // Engine is already stopped
      }
      await engine.delete();
      let query = `SELECT engine_name, url, status FROM information_schema.engines WHERE engine_name='${name}'`;
      let statement = await connection.execute(query);
      const { data: engine_data } = await statement.fetchResult();
      expect(engine_data.length == 0);

      const catalogName = await (
        firebolt.resourceManager.database as DatabaseService
      ).catalogName();

      await database.delete();
      query = `SELECT ${catalogName}_name, description FROM information_schema.${catalogName}s WHERE ${catalogName}_name='${name}'`;
      statement = await connection.execute(query);
      const { data: database_data } = await statement.fetchResult();
      expect(database_data.length == 0);
    });
  }
);

describe.each([["v2", connectionOptionsV2]])(
  "engine resource manager (account %s)",
  (account, connectionOptions) => {
    it("retrieves all engines", async () => {
      const firebolt = Firebolt({
        apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
      });

      await firebolt.connect(connectionOptions);

      const engine_name =
        (process.env.FIREBOLT_ENGINE_NAME as string) + "_list";
      try {
        const options: CreateEngineOptions = {
          fail_if_exists: false
        };
        if (account === "v2") {
          options.initially_stopped = true;
        }
        await firebolt.resourceManager.engine.create(engine_name, options);

        const engines = await firebolt.resourceManager.engine.getAll();

        expect(
          engines.find(engine => engine_name === engine.name)
        ).toBeTruthy();
      } finally {
        try {
          const engine = await firebolt.resourceManager.engine.getByName(
            engine_name
          );
          await engine?.stop();
          await engine?.delete();
        } catch {
          //ignore
        }
      }
    });

    it("use separate firebolt resource client", async () => {
      const firebolt = Firebolt({
        apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
      });
      const connection = await firebolt.connect(connectionOptions);
      const resourceManager = FireboltResourceManager({
        connection
      });
      const engine_name =
        (process.env.FIREBOLT_ENGINE_NAME as string) + "_getByName";
      try {
        await resourceManager.engine.create(engine_name, {
          fail_if_exists: false
        });
        const engine = await resourceManager.engine.getByName(engine_name);
        expect(engine.name).toEqual(engine_name);
      } finally {
        try {
          const engine = await resourceManager.engine.getByName(engine_name);
          await engine?.stop();
          await engine?.delete();
        } catch {
          //ignore
        }
      }
    });
  }
);
