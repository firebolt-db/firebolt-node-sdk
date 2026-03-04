import * as http from "http";
import * as crypto from "crypto";
import { assignProtocol } from "../../common/util";
import { RESOLVE_ORGANIZATION } from "../../common/api";
import { extractJwtExpiry, writeTokenToFile } from "../../auth/jwt";
import type { LoginOptions } from "./login";

const AUTH0_CLIENT_ID = "e5QDBO7aZEJdA0vc5zAuuvc19RWgE60i";
const AUTH0_AUDIENCE = "https://api.firebolt.io";
const AUTH0_SCOPES = "openid profile email";
const REDIRECT_PORT = 8549;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Derive the IDP endpoint from the API endpoint,
 * replacing the leading "api." with "idp.".
 */
function getIdpEndpoint(apiEndpoint: string): string {
  const url = new URL(assignProtocol(apiEndpoint));
  const hostParts = url.hostname.split(".");
  if (hostParts[0] === "api") {
    hostParts[0] = "idp";
  }
  url.hostname = hostParts.join(".");
  return url.origin;
}

/**
 * Resolve an account (org) name to an Auth0 organization ID
 * via GET {apiEndpoint}/web/v3/resolveOrganization/<name>
 */
async function resolveOrganization(
  apiEndpoint: string,
  accountName: string
): Promise<string> {
  const fetch = (await import("node-fetch")).default;
  const baseUrl = assignProtocol(apiEndpoint);
  const url = `${baseUrl}/${RESOLVE_ORGANIZATION}/${encodeURIComponent(
    accountName
  )}`;

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to resolve organization "${accountName}" (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as { organizationID: string };
  if (!data.organizationID) {
    throw new Error(
      `Organization "${accountName}" resolved but no organizationId in response`
    );
  }

  return data.organizationID;
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import("child_process");
  const platform = process.platform;

  let command: string;
  if (platform === "darwin") {
    command = `open "${url}"`;
  } else if (platform === "win32") {
    command = `start "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err: Error | null) => {
    if (err) {
      console.log(`\nCould not open browser automatically.`);
      console.log(`Please open this URL manually:\n  ${url}`);
    }
  });
}

export async function googleLogin(opts: LoginOptions): Promise<void> {
  const accountName = opts.account || process.env.FIREBOLT_ACCOUNT;

  if (!accountName) {
    throw new Error(
      "Account name is required for Google login. " +
        "Provide via --account flag or FIREBOLT_ACCOUNT env var."
    );
  }

  const apiEndpoint =
    opts.apiEndpoint ||
    process.env.FIREBOLT_API_ENDPOINT ||
    "api.app.firebolt.io";

  console.log(`Resolving organization "${accountName}"...`);
  const organizationId = await resolveOrganization(apiEndpoint, accountName);

  const idpEndpoint = getIdpEndpoint(apiEndpoint);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const authParams = new URLSearchParams({
    client_id: AUTH0_CLIENT_ID,
    scope: AUTH0_SCOPES,
    redirect_uri: REDIRECT_URI,
    audience: AUTH0_AUDIENCE,
    organization: organizationId,
    response_type: "code",
    response_mode: "query",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state
  });

  const authUrl = `${idpEndpoint}/authorize?${authParams.toString()}`;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");
      const returnedState = url.searchParams.get("state");
      const code = url.searchParams.get("code");

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Authentication failed</h2>" +
            `<p>${errorDescription || error}</p>` +
            "<p>You can close this window.</p></body></html>"
        );
        server.close();
        reject(new Error(`Auth error: ${error} - ${errorDescription || ""}`));
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>State mismatch</h2>" +
            "<p>Possible CSRF attack. Authentication aborted.</p></body></html>"
        );
        server.close();
        reject(new Error("State mismatch: possible CSRF attack"));
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<html><body><h2>Missing auth code</h2></body></html>");
        server.close();
        reject(new Error("No authorization code received"));
        return;
      }

      try {
        // Exchange the authorization code for tokens
        const fetch = (await import("node-fetch")).default;
        const tokenResponse = await fetch(`${idpEndpoint}/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            client_id: AUTH0_CLIENT_ID,
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier
          })
        });

        if (!tokenResponse.ok) {
          const body = await tokenResponse.text();
          throw new Error(
            `Token exchange failed (${tokenResponse.status}): ${body}`
          );
        }

        const data = (await tokenResponse.json()) as {
          access_token: string;
        };
        const token = data.access_token;

        writeTokenToFile(token);

        const expiresAtMs = extractJwtExpiry(token);
        const expiresStr = expiresAtMs
          ? new Date(expiresAtMs).toISOString()
          : "unknown";

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Authentication successful!</h2>" +
            "<p>You can close this window and return to the terminal.</p></body></html>"
        );

        console.log(`\nAuthentication successful!`);
        console.log(`Token saved to ~/.firebolt/token`);
        console.log(`Expires: ${expiresStr}`);
        console.log(`\nTo use in the current shell, run:`);
        console.log(`  export FIREBOLT_JWT=$(cat ~/.firebolt/token)`);

        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<html><body><h2>Token exchange failed</h2></body></html>");
        server.close();
        reject(err);
      }
    });

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Login timed out after 5 minutes"));
    }, TIMEOUT_MS);

    server.listen(REDIRECT_PORT, async () => {
      console.log("Opening browser for authentication...");
      console.log(`Waiting for callback on port ${REDIRECT_PORT}...`);
      await openBrowser(authUrl);
    });

    server.on("close", () => {
      clearTimeout(timeout);
    });
  });
}
