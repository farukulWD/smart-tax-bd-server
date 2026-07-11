class AppError extends Error {
  public statusCode: number;
  // Optional hint for the client (e.g. login blocked because phone unverified)
  public needsVerification?: boolean;

  constructor(statusCode: number, message: string, stack = '') {
    super(message);
    this.statusCode = statusCode;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
