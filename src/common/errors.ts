export class ApiError extends Error {
  message: string;
  status: number;
  code: string;

  constructor({
    message,
    status,
    code
  }: {
    message: string;
    status: number;
    code: string;
  }) {
    super(message);
    this.message = message;
    this.status = status;
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
