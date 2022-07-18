import { Firebolt } from "../../src/index";
import { ConnectionOptions } from "../../src/types";

const mockRequest = jest.fn().mockImplementation(() => {
  return {
    ready: jest.fn().mockImplementation(() =>
      Promise.resolve({
        engine_id: 11,
        engine: {
          id: "",
          name: "",
          description: "",
          endpoint: "",
          current_status_summary: ""
        },
        text: jest.fn().mockImplementation(() => "{}")
      })
    )
  };
});

jest.mock("../../src/http/node", () => ({
  NodeHttpClient: jest.fn().mockImplementation(() => {
    return {
      request: mockRequest
    };
  })
}));

jest.mock("../../src/auth");

afterEach(() => {
  mockRequest.mockClear();
});

describe("connection user agent", () => {
  it("propagation", async () => {
    const connectionParams: ConnectionOptions = {
      username: "dummy",
      password: "dummy",
      database: "dummy",
      engineName: "dummy"
    };
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1");
    await statement.fetchResult();
    expect(mockRequest.mock.calls[2][2]["headers"]["user-agent"]).toContain(
      "NodeSDK"
    );
  });
  it("customisation", async () => {
    const connectionParams: ConnectionOptions = {
      username: "dummy",
      password: "dummy",
      database: "dummy",
      engineName: "dummy",
      additional_parameters: {
        userClients: [{ name: "ClientA", version: "1.1.1" }],
        userDrivers: [{ name: "DriverA", version: "2.2.2" }]
      }
    };
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1");
    await statement.fetchResult();
    expect(mockRequest.mock.calls[2][2]["headers"]["user-agent"]).toContain(
      "NodeSDK"
    );
    expect(mockRequest.mock.calls[2][2]["headers"]["user-agent"]).toContain(
      "ClientA/1.1.1"
    );
    expect(mockRequest.mock.calls[2][2]["headers"]["user-agent"]).toContain(
      "DriverA/2.2.2"
    );
  });
});
