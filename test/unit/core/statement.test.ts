import { Firebolt, FireboltCore } from "../../../src";
import { ConnectionOptions } from "../../../src/types";

describe("Statement Core", () => {
  const connectionParams: ConnectionOptions = {
    auth: FireboltCore(),
    database: "test_db",
    engineEndpoint: "http://fake" // Not used in these tests, but required by ConnectionOptions
  };

  it("executeAsync throws error", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await expect(connection.executeAsync("SELECT 1")).rejects.toThrow(
      "Async queries are not supported in Firebolt Core"
    );
  });

  it("isAsyncQueryRunning throws error", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await expect(connection.isAsyncQueryRunning("token")).rejects.toThrow(
      "Async queries are not supported in Firebolt Core"
    );
  });

  it("isAsyncQuerySuccessful throws error", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await expect(connection.isAsyncQuerySuccessful("token")).rejects.toThrow(
      "Async queries are not supported in Firebolt Core"
    );
  });

  it("cancelAsyncQuery throws error", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    await expect(connection.cancelAsyncQuery("token")).rejects.toThrow(
      "Async queries are not supported in Firebolt Core"
    );
  });
});
