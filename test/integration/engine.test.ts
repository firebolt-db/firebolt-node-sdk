import { Firebolt } from "../../src/index";

const connectionOptions = {
  username: process.env.FIREBOLT_USERNAME as string,
  password: process.env.FIREBOLT_PASSWORD as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

describe("engine integration", () => {
  it("starts engine", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await firebolt.connect(connectionOptions);

    const engine = await firebolt.resourceManager.engine.getByName(
      process.env.FIREBOLT_ENGINE_NAME as string
    );

    const {
      engine: { name }
    } = await engine.start();

    expect(name).toEqual(process.env.FIREBOLT_ENGINE_NAME);
  });
});
