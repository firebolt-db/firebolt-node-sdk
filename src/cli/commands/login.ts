import * as readline from "readline";
import { extractJwtExpiry, writeTokenToFile } from "../../auth/jwt";
import { googleLogin } from "./google-login";

export interface LoginOptions {
  clientId?: string;
  clientSecret?: string;
  account?: string;
  apiEndpoint: string;
  google?: boolean;
}

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (hidden && process.stdin.isTTY) {
      // For secret input, temporarily mute output
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = ((
        chunk: string | Uint8Array,
        ...args: unknown[]
      ): boolean => {
        if (typeof chunk === "string" && chunk.includes(question)) {
          return origWrite(
            chunk,
            ...(args as [BufferEncoding?, ((err?: Error) => void)?])
          );
        }
        return true;
      }) as typeof process.stdout.write;

      rl.question(question, answer => {
        process.stdout.write = origWrite;
        console.log(); // newline after hidden input
        rl.close();
        resolve(answer.trim());
      });
    } else {
      rl.question(question, answer => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function resolveCredentials(opts: LoginOptions): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  const clientId =
    opts.clientId ||
    process.env.FIREBOLT_CLIENT_ID ||
    (process.stdin.isTTY ? await prompt("Client ID: ") : "");

  const clientSecret =
    opts.clientSecret ||
    process.env.FIREBOLT_CLIENT_SECRET ||
    (process.stdin.isTTY ? await prompt("Client Secret: ", true) : "");

  if (!clientId || !clientSecret) {
    throw new Error(
      "Client ID and secret are required. " +
        "Provide via --client-id/--client-secret flags, " +
        "FIREBOLT_CLIENT_ID/FIREBOLT_CLIENT_SECRET env vars, " +
        "or interactive prompt."
    );
  }

  return { clientId, clientSecret };
}

export async function login(opts: LoginOptions): Promise<void> {
  if (opts.google) {
    await googleLogin(opts);
    return;
  }

  const { clientId, clientSecret } = await resolveCredentials(opts);

  const apiEndpoint =
    opts.apiEndpoint ||
    process.env.FIREBOLT_API_ENDPOINT ||
    "api.app.firebolt.io";

  console.log(`Authenticating with ${apiEndpoint}...`);

  // Use the SDK's own Authenticator to perform OAuth
  const { Authenticator } = await import("../../auth/managed");

  // Minimal context setup for authentication
  const { NodeHttpClient } = await import("../../http/node");
  const httpClient = new NodeHttpClient();

  const authenticator = new Authenticator(
    {
      httpClient,
      apiEndpoint: `https://${apiEndpoint.replace(/^https?:\/\//, "")}`,
      logger: {
        info: () => {
          // do nothing
        }
      }
    },
    {
      auth: {
        client_id: clientId,
        client_secret: clientSecret
      }
    }
  );

  await authenticator.authenticate();
  const token = await authenticator.getToken();

  if (!token) {
    throw new Error("Authentication failed: no token received");
  }

  writeTokenToFile(token);

  const expiresAtMs = extractJwtExpiry(token);
  const expiresStr = expiresAtMs
    ? new Date(expiresAtMs).toISOString()
    : "unknown";

  console.log(`\nAuthentication successful!`);
  console.log(`Token saved to ~/.firebolt/token`);
  console.log(`Expires: ${expiresStr}`);
  console.log(`\nTo use in the current shell, run:`);
  console.log(`  export FIREBOLT_JWT=$(cat ~/.firebolt/token)`);
}
