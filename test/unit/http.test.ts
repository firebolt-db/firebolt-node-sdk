import { setupServer } from "msw/node";
import { rest } from "msw";
import { Authenticator } from "../../src/auth";
import { NodeHttpClient } from "../../src/http/node";
import { Logger } from "../../src/logger/node";
import { AuthOptions } from "../../src/types";

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

    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
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
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
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
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
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
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account"
      }
    );
    server.use(
      rest.post(`https://${apiEndpoint}/engines`, (req, res, ctx) => {
        expect(req.headers.get("Firebolt-Protocol-Version")).toEqual("2.3");
        return res(ctx.json({ ok: true }));
      })
    );
    await authenticator.authenticate();
    await httpClient.request("POST", `${apiEndpoint}/engines`).ready();
  });
});

describe.each([
  [
    "username/password",
    `https://${apiEndpoint}/auth/v1/login`,
    { username: "fake_client", password: "fake_secret" }
  ],
  [
    "client_id/client_secret",
    `https://id.fake.firebolt.io/oauth/token`,
    { client_id: "fake_client", client_secret: "fake_secret" }
  ]
])("token caching %s", (_, authUrl: string, auth: AuthOptions) => {
  const server = setupServer();
  let httpClient = new NodeHttpClient();

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });
  beforeEach(() => {
    httpClient = new NodeHttpClient();
  });

  it("caches and reuses access token", async () => {
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account",
        useCache: true
      }
    );

    let calls = 0;

    server.use(
      rest.post(authUrl, (req, res, ctx) => {
        calls++;
        return res(
          ctx.json({
            access_token: "fake_access_token",
            expires_in: 2 ^ 30
          })
        );
      })
    );

    authenticator.clearCache();

    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
    expect(calls).toEqual(1);
  });

  it("refreshes token if expired", async () => {
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account",
        useCache: true
      }
    );

    let calls = 0;

    server.use(
      rest.post(authUrl, (req, res, ctx) => {
        calls++;
        return res(
          ctx.json({
            access_token: "fake_access_token",
            refresh_token: "fake_refresh_token",
            expires_in: -100
          })
        );
      })
    );

    authenticator.clearCache();

    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
    expect(calls).toEqual(2);
  });

  it("disregards cache on 401 error", async () => {
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account",
        useCache: true
      }
    );

    let calls = 0;

    server.use(
      rest.post(authUrl, (req, res, ctx) => {
        calls++;
        return res(
          ctx.json({
            access_token: "fake_access_token",
            expires_in: 2 ^ 30
          })
        );
      }),
      rest.post(`https://${apiEndpoint}/engines`, (req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({
            message: "Unauthorized",
            code: 401
          })
        );
      })
    );

    authenticator.clearCache();
    await authenticator.authenticate();

    await expect(async () => {
      await httpClient.request("POST", `${apiEndpoint}/engines`).ready();
    }).rejects.toThrow("Unauthorized");

    expect(calls).toEqual(2);
  });

  it("doesn't cache token if useCache is false", async () => {
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account",
        useCache: false
      }
    );

    let calls = 0;

    server.use(
      rest.post(authUrl, (req, res, ctx) => {
        calls++;
        return res(
          ctx.json({
            access_token: "fake_access_token",
            expires_in: 2 ^ 30
          })
        );
      })
    );

    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
    expect(calls).toEqual(2);
  });

  it("caches different token for different apiEndpoints", async () => {
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account",
        useCache: true
      }
    );
    // Different Authenticator has to have different httpClient
    const httpClient2 = new NodeHttpClient();
    const authenticator2 = new Authenticator(
      {
        httpClient: httpClient2,
        apiEndpoint: "api.fake2.firebolt.io",
        logger
      },
      {
        auth,
        account: "my_account",
        useCache: true
      }
    );

    let calls = 0;
    const authUrl2 = authUrl.replace("fake", "fake2");

    server.use(
      rest.post(authUrl, (req, res, ctx) => {
        calls++;
        return res(
          ctx.json({
            access_token: "fake_access_token",
            expires_in: 2 ^ 30
          })
        );
      }),
      rest.post(authUrl2, (req, res, ctx) => {
        calls++;
        return res(
          ctx.json({
            access_token: "fake_access_token",
            expires_in: 2 ^ 30
          })
        );
      })
    );

    authenticator.clearCache();
    authenticator2.clearCache();

    await authenticator.authenticate();
    expect(authenticator.accessToken).toEqual("fake_access_token");
    await authenticator2.authenticate();
    expect(authenticator2.accessToken).toEqual("fake_access_token");
    expect(calls).toEqual(2);
  });
  it("does not overwrite token when run concurrently", async () => {
    const authenticator = new Authenticator(
      { httpClient, apiEndpoint, logger },
      {
        auth,
        account: "my_account",
        useCache: true
      }
    );

    let calls = 0;

    server.use(
      rest.post(authUrl, (req, res, ctx) => {
        calls++;
        return res(
          ctx.json({
            access_token: "fake_access_token",
            expires_in: 2 ^ 30
          })
        );
      })
    );

    authenticator.clearCache();

    const promises = Array(10)
      .fill(null)
      .map(() => authenticator.authenticate());

    await Promise.all(promises);
    expect(calls).toEqual(1);
  });
});
