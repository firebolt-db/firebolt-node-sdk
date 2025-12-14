import { Firebolt, FireboltCore } from "../../../src";
import { ConnectionOptions } from "../../../src/types";

describe("Transaction Core", () => {
  const connectionParams: ConnectionOptions = {
    auth: FireboltCore(),
    database: "test_db",
    engineEndpoint: "http://fake" // Not used in these tests, but required by ConnectionOptions
  };

  it("begin throws error", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await expect(connection.begin()).rejects.toThrow(
      "Transactions are not supported in Firebolt Core"
    );
  });

  it("commit throws error", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await expect(connection.commit()).rejects.toThrow(
      "Transactions are not supported in Firebolt Core"
    );
  });

  it("rollback throws error", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await expect(connection.rollback()).rejects.toThrow(
      "Transactions are not supported in Firebolt Core"
    );
  });
});
