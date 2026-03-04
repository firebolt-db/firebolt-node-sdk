import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const TOKEN_FILE_DIR = ".firebolt";
const TOKEN_FILE_NAME = "token";
const JWT_ENV_VAR_NAME = "FIREBOLT_JWT";
const EXPIRY_BUFFER_MS = 30_000;

export type ResolvedJwt = {
  token: string;
  expiresAtMs: number;
};

export function getTokenFilePath(): string {
  return path.join(os.homedir(), TOKEN_FILE_DIR, TOKEN_FILE_NAME);
}

/**
 * Decode the payload of a JWT (no signature verification) and extract the `exp` claim.
 * Returns the expiry as a Unix‐millisecond timestamp, or undefined if missing/invalid.
 */
export function extractJwtExpiry(token: string): number | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (typeof payload.exp === "number") {
      return payload.exp * 1000; // seconds → ms
    }
  } catch {
    // malformed token – fall through
  }
  return undefined;
}

export function isTokenExpired(expiresAtMs: number): boolean {
  return Date.now() >= expiresAtMs - EXPIRY_BUFFER_MS;
}

export function getJwtFromEnv(): string | undefined {
  const value = process.env[JWT_ENV_VAR_NAME];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export function getStoredTokenFromFile(): string | undefined {
  const filePath = getTokenFilePath();
  try {
    const content = fs.readFileSync(filePath, "utf-8").trim();
    return content !== "" ? content : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve a JWT from env var or file.
 * Priority: FIREBOLT_JWT env var > ~/.firebolt/token file.
 * Returns undefined if no valid (non‑expired) token is found.
 */
export function resolveJwt(): ResolvedJwt | undefined {
  const sources: Array<() => string | undefined> = [
    getJwtFromEnv,
    getStoredTokenFromFile
  ];

  for (const source of sources) {
    const token = source();
    if (!token) continue;

    const expiresAtMs = extractJwtExpiry(token);
    if (expiresAtMs === undefined) continue;
    if (isTokenExpired(expiresAtMs)) continue;

    return { token, expiresAtMs };
  }

  return undefined;
}

/**
 * Write a token string to ~/.firebolt/token with secure permissions.
 */
export function writeTokenToFile(token: string): void {
  const filePath = getTokenFilePath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  fs.writeFileSync(filePath, token, { encoding: "utf-8", mode: 0o600 });
}

/**
 * Remove the cached token file if it exists.
 */
export function removeTokenFile(): void {
  const filePath = getTokenFilePath();
  try {
    fs.unlinkSync(filePath);
  } catch {
    // file doesn't exist – nothing to do
  }
}
