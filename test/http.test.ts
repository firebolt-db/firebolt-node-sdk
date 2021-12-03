import { setupServer } from "msw/node";
import { rest } from "msw";
import { Authenticator } from "../src/auth";
import { NodeHttpClient } from "../src/http/node";
import { Logger } from "../src/logger/node";
import { ResourceManager } from "../src/service";

const apiUrl = "fake.api.com";
const logger = new Logger();

const authHandler = rest.post(
  `https://${apiUrl}/auth/v1/login`,
  (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: "fake_access_token",
        refresh_token: "fake_refresh_token"
      })
    );
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
    server.use(authHandler);
    expect(authenticator.accessToken).toBeFalsy();
    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
  });
  it("sends access token in headers", async () => {
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
    server.use(
      authHandler,
      rest.post(`https://${apiUrl}/engines`, (req, res, ctx) => {
        expect(req.headers.get("Authorization")).toEqual(
          "Bearer fake_access_token"
        );
        return res(ctx.json({ ok: true }));
      })
    );
    await authenticator.authenticate();
    await httpClient.request("POST", `${apiUrl}/engines`);
  });
  it("throw error if status > 300", async () => {
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
    server.use(
      authHandler,
      rest.post(`https://${apiUrl}/engines`, (req, res, ctx) => {
        return res(
          ctx.status(404),
          ctx.json({ message: "Record not found", code: 42 })
        );
      })
    );
    await authenticator.authenticate();
    expect(async () => {
      await httpClient.request("POST", `${apiUrl}/engines`);
    }).rejects.toThrow("Record not found");
  });
  it("refresh token on 401", async () => {
    const statusMock = jest.fn().mockReturnValueOnce(401).mockReturnValue(200);
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
    server.use(
      authHandler,
      rest.post(`https://${apiUrl}/auth/v1/refresh`, (req, res, ctx) => {
        return res(
          ctx.json({
            access_token: "new_access_token"
          })
        );
      }),
      rest.post(`https://${apiUrl}/engines`, (req, res, ctx) => {
        return res(
          ctx.status(statusMock()),
          ctx.json({ message: "Unauthorized", code: 401 })
        );
      })
    );
    await authenticator.authenticate();
    const initialAccessToken = authenticator.accessToken;
    await httpClient.request("POST", `${apiUrl}/engines`);
    expect(initialAccessToken).not.toEqual(authenticator.accessToken);
  });
});
