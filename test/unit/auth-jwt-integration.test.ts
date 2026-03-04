import { setupServer } from "msw/node";
import { rest } from "msw";
import { Authenticator } from "../../src/auth/managed";
import { NodeHttpClient } from "../../src/http/node";
import { Logger } from "../../src/logger/node";

const apiEndpoint = "api.fake.firebolt.io";

// Helper: create a fake JWT with a given exp claim
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = "fakesig";
  return `${header}.${body}.${sig}`;
}

const oauthToken = "oauth-access-token-123";

const server = setupServer(
  rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: oauthToken,
        token_type: "bearer",
        expires_in: 86400
      })
    );
  })
);

function createAuthenticator() {
  const context = {
    logger: new Logger(),
    httpClient: new NodeHttpClient(),
    apiEndpoint
  };
  return new Authenticator(
    context as any,
    {
      auth: {
        client_id: "test-client-id",
        client_secret: "test-client-secret"
      }
    } as any
  );
}

describe("Authenticator JWT integration", () => {
  let originalEnv: string | undefined;

  beforeAll(() => server.listen());
  afterAll(() => server.close());

  beforeEach(() => {
    originalEnv = process.env.FIREBOLT_JWT;
    server.resetHandlers();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FIREBOLT_JWT;
    } else {
      process.env.FIREBOLT_JWT = originalEnv;
    }
  });

  it("uses JWT from env var and skips OAuth", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwtToken = makeJwt({ exp: futureExp });
    process.env.FIREBOLT_JWT = jwtToken;

    // Make OAuth endpoint return an error to verify it's not called
    server.use(
      rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: "should not be called" })
        );
      })
    );

    const auth = createAuthenticator();
    await auth.authenticate();

    const token = await auth.getToken();
    expect(token).toBe(jwtToken);
  });

  it("falls through to OAuth when JWT is expired", async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    process.env.FIREBOLT_JWT = makeJwt({ exp: pastExp });

    const auth = createAuthenticator();
    await auth.authenticate();

    const token = await auth.getToken();
    expect(token).toBe(oauthToken);
  });

  it("falls through to OAuth when no JWT is available", async () => {
    delete process.env.FIREBOLT_JWT;

    const auth = createAuthenticator();
    await auth.authenticate();

    const token = await auth.getToken();
    expect(token).toBe(oauthToken);
  });

  it("reAuthenticate picks up a newer JWT", async () => {
    // Start with OAuth
    delete process.env.FIREBOLT_JWT;
    const auth = createAuthenticator();
    await auth.authenticate();
    expect(await auth.getToken()).toBe(oauthToken);

    // Now set a JWT in env
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const newJwt = makeJwt({ exp: futureExp });
    process.env.FIREBOLT_JWT = newJwt;

    await auth.reAuthenticate();
    expect(await auth.getToken()).toBe(newJwt);
  });

  it("reAuthenticate falls through to OAuth when JWT matches current token", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwtToken = makeJwt({ exp: futureExp });
    process.env.FIREBOLT_JWT = jwtToken;

    const auth = createAuthenticator();
    await auth.authenticate();
    expect(await auth.getToken()).toBe(jwtToken);

    // reAuthenticate with same JWT should fall through to OAuth
    await auth.reAuthenticate();
    expect(await auth.getToken()).toBe(oauthToken);
  });
});
