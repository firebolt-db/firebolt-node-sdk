import { setupServer } from "msw/node";
import { rest } from "msw";
import { Authenticator } from "../../src/auth";
import { NodeHttpClient } from "../../src/http/node";
import { Logger } from "../../src/logger/node";
import { QueryFormatter } from "../../src/formatter";

const apiEndpoint = "api.fake.firebolt.io";
const logger = new Logger();

const authHandlerV2 = rest.post(
  `https://id.fake.firebolt.io/oauth/token`,
  (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: "fake_access_token"
      })
    );
  }
);

const authHandlerV1 = rest.post(
  `https://${apiEndpoint}/auth/v1/login`,
  (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: "fake_access_token",
        refresh_token: "fake_refresh_token"
      })
    );
  }
);

describe.each([
  ["v1", authHandlerV1, { username: "user", password: "fake_password" }],
  ["v2", authHandlerV2, { client_id: "user", client_secret: "fake_password" }]
])("http client %s", (version, authHandler, auth) => {
  const server = setupServer();

  server.use(authHandler);

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });

  it("stores access token", async () => {
    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();

    const authenticator = new Authenticator(
      { queryFormatter, httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account"
      }
    );
    expect(authenticator.accessToken).toBeFalsy();
    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
  });
  it("sends access token in headers", async () => {
    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const authenticator = new Authenticator(
      { queryFormatter, httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account"
      }
    );
    server.use(
      rest.post(`https://${apiEndpoint}/engines`, (req, res, ctx) => {
        expect(req.headers.get("Authorization")).toEqual(
          "Bearer fake_access_token"
        );
        return res(ctx.json({ ok: true }));
      })
    );
    await authenticator.authenticate();
    await httpClient.request("POST", `${apiEndpoint}/engines`).ready();
  });
  it("throw error if status > 300", async () => {
    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const authenticator = new Authenticator(
      { queryFormatter, httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account"
      }
    );
    server.use(
      rest.post(`https://${apiEndpoint}/engines`, (req, res, ctx) => {
        return res(
          ctx.status(404),
          ctx.json({ message: "Record not found", code: 42 })
        );
      })
    );
    await authenticator.authenticate();
    await expect(async () => {
      await httpClient.request("POST", `${apiEndpoint}/engines`).ready();
    }).rejects.toThrow("Record not found");
  });

  it("sends protocol version in headers", async () => {
    const httpClient = new NodeHttpClient();
    const queryFormatter = new QueryFormatter();
    const authenticator = new Authenticator(
      { queryFormatter, httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account"
      }
    );
    server.use(
      rest.post(`https://${apiEndpoint}/engines`, (req, res, ctx) => {
        expect(req.headers.get("Firebolt-Protocol-Version")).toEqual("2.0");
        return res(ctx.json({ ok: true }));
      })
    );
    await authenticator.authenticate();
    await httpClient.request("POST", `${apiEndpoint}/engines`).ready();
  });
});
