import {
  extractJwtExpiry,
  getJwtFromEnv,
  getStoredTokenFromFile,
  getTokenFilePath,
  isTokenExpired
} from "../../auth/jwt";

function describeToken(label: string, token: string | undefined): void {
  if (!token) {
    console.log(`  ${label}: not set`);
    return;
  }

  const expiresAtMs = extractJwtExpiry(token);
  if (expiresAtMs === undefined) {
    console.log(`  ${label}: present (could not decode expiry)`);
    return;
  }

  const expired = isTokenExpired(expiresAtMs);
  const expiresStr = new Date(expiresAtMs).toISOString();
  const statusStr = expired ? "EXPIRED" : "valid";

  console.log(`  ${label}: ${statusStr}, expires ${expiresStr}`);
}

export function status(): void {
  console.log("Firebolt auth status:\n");

  const envToken = getJwtFromEnv();
  describeToken("FIREBOLT_JWT env var", envToken);

  const fileToken = getStoredTokenFromFile();
  describeToken(`Token file (${getTokenFilePath()})`, fileToken);

  // Show which source would be used
  const activeSource = envToken
    ? "FIREBOLT_JWT env var"
    : fileToken
    ? "token file"
    : "none";

  console.log(`\n  Active source: ${activeSource}`);
}
