export const MISSING_USERNAME = 404001;
export const MISSING_PASSWORD = 404002;
export const MISSING_DATABASE = 404003;
export const MISSING_ENGINE_ENDPOINT = 404004;

export const INVALID_PARAMETERS = 400001;

const errorMessages: Record<number, string> = {
  [MISSING_PASSWORD]: "Password is missing",
  [MISSING_USERNAME]: "Username is missing",
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

  constructor({
    message,
    status,
    code,
    raw
  }: {
    message: string;
    status: number;
    code: string;
    raw?: any;
  }) {
    const formattedMessage = `
Request failed
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
