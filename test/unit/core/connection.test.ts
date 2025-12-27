import { Firebolt, FireboltCore } from "../../../src";
import { ConnectionOptions } from "../../../src/types";

describe("Connection Core", () => {
  it("requires engineEndpoint", async () => {
    const firebolt = Firebolt();
    const connectionParams: ConnectionOptions = {
      auth: FireboltCore(),
      database: "test_db"
      // Missing engineEndpoint
    };

    await expect(firebolt.connect(connectionParams)).rejects.toThrow(
      "engineEndpoint is required for Firebolt Core connections"
    );
  });

});
