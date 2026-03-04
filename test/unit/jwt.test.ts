import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  extractJwtExpiry,
  getJwtFromEnv,
  getStoredTokenFromFile,
  getTokenFilePath,
  isTokenExpired,
  removeTokenFile,
  resolveJwt,
  writeTokenToFile
} from "../../src/auth/jwt";

// Helper: create a fake JWT with a given exp claim
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = "fakesig";
  return `${header}.${body}.${sig}`;
}

describe("extractJwtExpiry", () => {
  it("returns milliseconds for valid JWT with exp", () => {
    const exp = 1700000000;
    const token = makeJwt({ exp });
    expect(extractJwtExpiry(token)).toBe(exp * 1000);
  });

  it("returns undefined for JWT without exp", () => {
    const token = makeJwt({ sub: "user" });
    expect(extractJwtExpiry(token)).toBeUndefined();
  });

  it("returns undefined for malformed token", () => {
    expect(extractJwtExpiry("not.a.jwt")).toBeUndefined();
    expect(extractJwtExpiry("single")).toBeUndefined();
    expect(extractJwtExpiry("")).toBeUndefined();
  });
});

describe("isTokenExpired", () => {
  it("returns false when token is valid", () => {
    const futureMs = Date.now() + 60_000;
    expect(isTokenExpired(futureMs)).toBe(false);
  });

  it("returns true when token is expired", () => {
    const pastMs = Date.now() - 60_000;
    expect(isTokenExpired(pastMs)).toBe(true);
  });

  it("returns true within 30s buffer", () => {
    const almostExpiredMs = Date.now() + 15_000; // 15s from now, within 30s buffer
    expect(isTokenExpired(almostExpiredMs)).toBe(true);
  });
});

describe("getJwtFromEnv", () => {
  const originalEnv = process.env.FIREBOLT_JWT;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FIREBOLT_JWT;
    } else {
      process.env.FIREBOLT_JWT = originalEnv;
    }
  });

  it("returns token from env var", () => {
    process.env.FIREBOLT_JWT = "my-token";
    expect(getJwtFromEnv()).toBe("my-token");
  });

  it("trims whitespace", () => {
    process.env.FIREBOLT_JWT = "  my-token  ";
    expect(getJwtFromEnv()).toBe("my-token");
  });

  it("returns undefined when not set", () => {
    delete process.env.FIREBOLT_JWT;
    expect(getJwtFromEnv()).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    process.env.FIREBOLT_JWT = "  ";
    expect(getJwtFromEnv()).toBeUndefined();
  });
});

describe("file operations", () => {
  const tokenFilePath = getTokenFilePath();
  const tokenDir = path.dirname(tokenFilePath);

  afterEach(() => {
    // Clean up any test files
    try {
      fs.unlinkSync(tokenFilePath);
    } catch {
      /* ignore */
    }
    try {
      fs.rmdirSync(tokenDir);
    } catch {
      /* ignore */
    }
  });

  describe("writeTokenToFile", () => {
    it("creates directory and writes token", () => {
      // Remove dir if it exists from prior runs
      try {
        fs.unlinkSync(tokenFilePath);
      } catch {
        /* ignore */
      }
      try {
        fs.rmdirSync(tokenDir);
      } catch {
        /* ignore */
      }

      writeTokenToFile("test-token-123");

      const content = fs.readFileSync(tokenFilePath, "utf-8");
      expect(content).toBe("test-token-123");
    });

    it("overwrites existing token", () => {
      writeTokenToFile("first-token");
      writeTokenToFile("second-token");

      const content = fs.readFileSync(tokenFilePath, "utf-8");
      expect(content).toBe("second-token");
    });
  });

  describe("getStoredTokenFromFile", () => {
    it("reads token from file", () => {
      writeTokenToFile("file-token");
      expect(getStoredTokenFromFile()).toBe("file-token");
    });

    it("returns undefined when file does not exist", () => {
      try {
        fs.unlinkSync(tokenFilePath);
      } catch {
        /* ignore */
      }
      expect(getStoredTokenFromFile()).toBeUndefined();
    });
  });

  describe("removeTokenFile", () => {
    it("removes the token file", () => {
      writeTokenToFile("to-remove");
      expect(fs.existsSync(tokenFilePath)).toBe(true);

      removeTokenFile();
      expect(fs.existsSync(tokenFilePath)).toBe(false);
    });

    it("does not throw when file does not exist", () => {
      try {
        fs.unlinkSync(tokenFilePath);
      } catch {
        /* ignore */
      }
      expect(() => removeTokenFile()).not.toThrow();
    });
  });
});

describe("resolveJwt", () => {
  const originalEnv = process.env.FIREBOLT_JWT;
  const tokenFilePath = getTokenFilePath();

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FIREBOLT_JWT;
    } else {
      process.env.FIREBOLT_JWT = originalEnv;
    }
    try {
      fs.unlinkSync(tokenFilePath);
    } catch {
      /* ignore */
    }
  });

  it("returns undefined when no sources available", () => {
    delete process.env.FIREBOLT_JWT;
    try {
      fs.unlinkSync(tokenFilePath);
    } catch {
      /* ignore */
    }
    expect(resolveJwt()).toBeUndefined();
  });

  it("resolves from env var with valid token", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt({ exp: futureExp });
    process.env.FIREBOLT_JWT = token;

    const result = resolveJwt();
    expect(result).toBeDefined();
    expect(result!.token).toBe(token);
    expect(result!.expiresAtMs).toBe(futureExp * 1000);
  });

  it("resolves from file when env var is not set", () => {
    delete process.env.FIREBOLT_JWT;
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt({ exp: futureExp });
    writeTokenToFile(token);

    const result = resolveJwt();
    expect(result).toBeDefined();
    expect(result!.token).toBe(token);
  });

  it("env var takes priority over file", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const envToken = makeJwt({ exp: futureExp, source: "env" });
    const fileToken = makeJwt({ exp: futureExp, source: "file" });

    process.env.FIREBOLT_JWT = envToken;
    writeTokenToFile(fileToken);

    const result = resolveJwt();
    expect(result).toBeDefined();
    expect(result!.token).toBe(envToken);
  });

  it("skips expired env var token and falls through to file", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const futureExp = Math.floor(Date.now() / 1000) + 3600;

    process.env.FIREBOLT_JWT = makeJwt({ exp: pastExp });
    const fileToken = makeJwt({ exp: futureExp });
    writeTokenToFile(fileToken);

    const result = resolveJwt();
    expect(result).toBeDefined();
    expect(result!.token).toBe(fileToken);
  });

  it("returns undefined when all tokens are expired", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    process.env.FIREBOLT_JWT = makeJwt({ exp: pastExp });
    writeTokenToFile(makeJwt({ exp: pastExp }));

    expect(resolveJwt()).toBeUndefined();
  });
});

describe("getTokenFilePath", () => {
  it("returns a path under home directory", () => {
    const filePath = getTokenFilePath();
    expect(filePath).toBe(path.join(os.homedir(), ".firebolt", "token"));
  });
});
