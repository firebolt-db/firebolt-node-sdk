#!/usr/bin/env node

import { Command } from "commander";
import { login } from "./commands/login";
import { logout } from "./commands/logout";
import { status } from "./commands/status";

const program = new Command();

program.name("firebolt-auth").description("Firebolt authentication CLI");

program
  .command("login")
  .description("Authenticate and cache a JWT token")
  .option("--client-id <id>", "Service account client ID")
  .option("--client-secret <secret>", "Service account client secret")
  .option("--account <name>", "Firebolt account name")
  .option("--api-endpoint <url>", "API endpoint", "api.app.firebolt.io")
  .option("--google", "Use browser-based login (Google SSO / SAML via Auth0)")
  .action(async opts => {
    await login(opts);
  });

program
  .command("logout")
  .description("Remove cached token")
  .action(async () => {
    await logout();
  });

program
  .command("status")
  .description("Show current auth status")
  .action(() => {
    status();
  });

program
  .parseAsync(process.argv)
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error("Error:", err.message || err);
    process.exit(1);
  });
