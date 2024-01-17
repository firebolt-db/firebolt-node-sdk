export const MISSING_CLIENT_ID = 404001;
export const MISSING_CLIENT_SECRET = 404002;
export const MISSING_DATABASE = 404003;
export const MISSING_ENGINE_ENDPOINT = 404004;

export const INVALID_PARAMETERS = 400001;

const errorMessages: Record<number, string> = {
  [MISSING_CLIENT_ID]: "Password is missing",
  [MISSING_CLIENT_SECRET]: "Username is missing",
  [MISSING_DATABASE]: "Database is missing",
  [MISSING_ENGINE_ENDPOINT]:
    "At least one should be provided: engineName or engineEndpoint",
  [INVALID_PARAMETERS]: "Parameters should be array"
};

export class ApiError extends Error {
  message: string;
  status: number;
  code: string;
  raw?: any;
  url: string;

  constructor({
    message,
    status,
    code,
    raw,
    url
  }: {
    message: string;
    status: number;
    code: string;
    url: string;
    raw?: any;
  }) {
    const formattedMessage = `
Request failed
URL: ${url}
Reason: ${message}
Response status: ${status}
${code ? `Code: ${code}` : ""}
${raw ? `Response: ${JSON.stringify(raw, null, 2)}` : ""}
`;
    super(formattedMessage);
    this.message = formattedMessage;
    this.status = status;
    this.code = code;
    this.raw = raw;
    this.url = url;
  }
}

export class ArgumentError extends Error {
  message: string;
  code: number;

  constructor({ code }: { code: number }) {
    const message = errorMessages[code];
    super(message);
    this.message = message;
    this.code = code;
  }
}

export class AuthenticationError extends Error {
  message: string;
  constructor({ message }: { message: string }) {
    super(message);
    this.message = message;
  }
}

export class AccessError extends Error {
  message: string;
  constructor({ message }: { message: string }) {
    super(message);
    this.message = message;
  }
}

export class ConnectionError extends Error {
  message: string;
  constructor({ message }: { message: string }) {
    super(message);
    this.message = message;
  }
}

export class DeprecationError extends Error {
  message: string;
  constructor({ message }: { message: string }) {
    super(message);
    this.message = message;
  }
}

export class AccountNotFoundError extends Error {
  message: string;
  constructor({ account_name }: { account_name: string }) {
    const message =
      `Account '${account_name}' does not exist ` +
      "in this organization or is not authorized. " +
      "Please verify the account name and make sure your " +
      "service account has the correct RBAC permissions and " +
      "is linked to a user.";
    super(message);
    this.message = message;
  }
}
