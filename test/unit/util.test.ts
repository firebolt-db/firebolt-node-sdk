import { generateUserAgent } from "../../src/common/util"
import { ConnectorVersion } from "../../src/types";

describe("user agent", () => {
  it("no overrides", () => {
    const userAgent = generateUserAgent(undefined, undefined);
    expect(userAgent).toMatch(/NodeSDK\/(\d+\.)?(\d+\.)?(\d+) \(Node v(\d+\.)?(\d+\.)?(\d+); \w+ (\d+\.)?(\d+\.)?(\d+) \)/)
  });
  it("with clients", () => {
    const clients: ConnectorVersion[] = [{name: "ConnA", version: "1.0.1"}, {name: "ConnB", version: "2.19.0"}];
    const userAgent = generateUserAgent(clients, undefined);
    expect(userAgent).toMatch(/ConnA\/1.0.1 ConnB\/2.19.0 NodeSDK\/(\d+\.)?(\d+\.)?(\d+) \(Node v(\d+\.)?(\d+\.)?(\d+); \w+ (\d+\.)?(\d+\.)?(\d+) \)/)
  });
  it("with drivers", () => {
    const drivers: ConnectorVersion[] = [{name: "DriverA", version: "1.0.1"}, {name: "DriverB", version: "2.19.0"}];
    const userAgent = generateUserAgent(undefined, drivers);
    expect(userAgent).toMatch(/NodeSDK\/(\d+\.)?(\d+\.)?(\d+) \(Node v(\d+\.)?(\d+\.)?(\d+); \w+ (\d+\.)?(\d+\.)?(\d+) \) DriverA\/1.0.1 DriverB\/2.19.0/)
  });
  it("with clients and drivers", () => {
    const clients: ConnectorVersion[] = [{name: "ConnA", version: "1.0.1"}, {name: "ConnB", version: "2.19.0"}];
    const drivers: ConnectorVersion[] = [{name: "DriverA", version: "1.0.1"}, {name: "DriverB", version: "2.19.0"}];
    const userAgent = generateUserAgent(clients, drivers);
    expect(userAgent).toMatch(/ConnA\/1.0.1 ConnB\/2.19.0 NodeSDK\/(\d+\.)?(\d+\.)?(\d+) \(Node v(\d+\.)?(\d+\.)?(\d+); \w+ (\d+\.)?(\d+\.)?(\d+) \) DriverA\/1.0.1 DriverB\/2.19.0/)
  });
});
