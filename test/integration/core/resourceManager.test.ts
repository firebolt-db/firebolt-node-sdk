import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("resource manager", () => {
  it("does not create resourceManager for Core connections", async () => {
    const firebolt = Firebolt();

    await firebolt.connect(connectionParams);

    expect(() => firebolt.resourceManager).toThrow(
      "ResourceManager is not available for Firebolt Core connections. Use managed Firebolt authentication (client_id/client_secret) to access ResourceManager."
    );
  });
});

