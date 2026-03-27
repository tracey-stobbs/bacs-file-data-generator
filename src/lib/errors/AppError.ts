export type AppErrorCode = 'UNSUPPORTED_FILE_TYPE' | 'INVALID_SEED' | 'VALIDATION_FAILED';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, httpStatus = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export default AppError;
