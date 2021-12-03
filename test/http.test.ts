import { setupServer } from "msw/node";
import { rest } from "msw";
import { Authenticator } from "../src/auth";
import { NodeHttpClient } from "../src/http/node";
import { Logger } from "../src/logger/node";
import { ResourceManager } from "../src/service";

const apiUrl = "fake.api.com";
const logger = new Logger();
const httpClient = new NodeHttpClient();
const resourceManager = new ResourceManager({ httpClient, apiUrl, logger });
const authenticator = new Authenticator(
  { httpClient, apiUrl, logger, resourceManager },
  {
    username: "user",
    password: "fake_password",
    database: "fake_database"
  }
);

describe("http client", () => {
  const server = setupServer();
  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });

  it("stores access token", async () => {
    server.use(
      rest.post(`https://${apiUrl}/auth/v1/login`, (req, res, ctx) => {
        return res(
          ctx.json({
            access_token: "fake_access_token",
            refresh_token: "fake_refresh_token"
          })
        );
      })
    );
    server.printHandlers();
    expect(authenticator.accessToken).toBeFalsy();
    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
  });
  it("sends access token in headers", () => {});
  it("throw error if status > 300", () => {});
  it("refresh token on 401", () => {});
});
