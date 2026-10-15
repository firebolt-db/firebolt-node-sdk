import { removeTokenFile, getTokenFilePath } from "../../auth/jwt";

export async function logout(): Promise<void> {
  removeTokenFile();
  console.log(`Removed cached token from ${getTokenFilePath()}`);
  console.log(`\nTo clear the token from the current shell, run:`);
  console.log(`  unset FIREBOLT_JWT`);
}
