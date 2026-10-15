import * as fs from "fs";
import { getTokenFilePath, writeTokenToFile } from "../../src/auth/jwt";
import { status } from "../../src/cli/commands/status";
import { logout } from "../../src/cli/commands/logout";

// Helper: create a fake JWT with a given exp claim
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = "fakesig";
  return `${header}.${body}.${sig}`;
}

describe("CLI commands", () => {
  let originalEnv: string | undefined;
  let consoleSpy: jest.SpyInstance;
  const tokenFilePath = getTokenFilePath();

  beforeEach(() => {
    originalEnv = process.env.FIREBOLT_JWT;
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FIREBOLT_JWT;
    } else {
      process.env.FIREBOLT_JWT = originalEnv;
    }
    consoleSpy.mockRestore();
    try {
      fs.unlinkSync(tokenFilePath);
    } catch {
      /* ignore */
    }
  });

  describe("status command", () => {
    it("reports when no tokens are available", () => {
      delete process.env.FIREBOLT_JWT;
      try {
        fs.unlinkSync(tokenFilePath);
      } catch {
        /* ignore */
      }

      status();

      const output = consoleSpy.mock.calls
        .map((c: unknown[]) => c[0])
        .join("\n");
      expect(output).toContain("not set");
      expect(output).toContain("Active source: none");
    });

    it("reports valid env var token", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      process.env.FIREBOLT_JWT = makeJwt({ exp: futureExp });

      status();

      const output = consoleSpy.mock.calls
        .map((c: unknown[]) => c[0])
        .join("\n");
      expect(output).toContain("valid");
      expect(output).toContain("Active source: FIREBOLT_JWT env var");
    });

    it("reports expired token", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      process.env.FIREBOLT_JWT = makeJwt({ exp: pastExp });

      status();

      const output = consoleSpy.mock.calls
        .map((c: unknown[]) => c[0])
        .join("\n");
      expect(output).toContain("EXPIRED");
    });

    it("reports valid file token", () => {
      delete process.env.FIREBOLT_JWT;
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      writeTokenToFile(makeJwt({ exp: futureExp }));

      status();

      const output = consoleSpy.mock.calls
        .map((c: unknown[]) => c[0])
        .join("\n");
      expect(output).toContain("valid");
      expect(output).toContain("Active source: token file");
    });
  });

  describe("logout command", () => {
    it("removes token file", async () => {
      writeTokenToFile("some-token");
      expect(fs.existsSync(tokenFilePath)).toBe(true);

      await logout();

      expect(fs.existsSync(tokenFilePath)).toBe(false);
      const output = consoleSpy.mock.calls
        .map((c: unknown[]) => c[0])
        .join("\n");
      expect(output).toContain("Removed cached token");
      expect(output).toContain("unset FIREBOLT_JWT");
    });

    it("does not throw if no token file exists", async () => {
      try {
        fs.unlinkSync(tokenFilePath);
      } catch {
        /* ignore */
      }
      await expect(logout()).resolves.not.toThrow();
    });
  });
});
