/**
 * API error contract — FROZEN. Reference: PRD sections 6 and 8.
 *
 * Every failing endpoint answers with `{ error: { code, message, field?, requestId } }`
 * and never leaks a stack trace or partial plaintext.
 */

export const ERROR_STATUS = {
  BAD_REQUEST: 400,
  INVALID_HEADER: 400,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_FORMAT: 415,
  CAPACITY_EXCEEDED: 422,
  MEDIA_MISMATCH: 422,
  EXTRACTION_FAILED: 422,
  UNAUTHENTICATED: 401,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

/** Message shown when GCM authentication fails. Deliberately never claims the key is wrong. */
export const EXTRACTION_FAILED_MESSAGE =
  "Unable to extract: the passphrase may be incorrect or the media may be damaged.";

export const NO_PAYLOAD_MESSAGE = "No supported STEGO-AE payload was found.";

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly field?: string;

  constructor(code: ErrorCode, message: string, field?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.field = field;
  }

  static badRequest(message: string, field?: string) {
    return new ApiError("BAD_REQUEST", message, field);
  }

  static invalidHeader(message = NO_PAYLOAD_MESSAGE) {
    return new ApiError("INVALID_HEADER", message);
  }

  static tooLarge(message: string, field?: string) {
    return new ApiError("PAYLOAD_TOO_LARGE", message, field);
  }

  static unsupportedFormat(message: string, field?: string) {
    return new ApiError("UNSUPPORTED_FORMAT", message, field);
  }

  static capacityExceeded(message: string, field?: string) {
    return new ApiError("CAPACITY_EXCEEDED", message, field);
  }

  static mediaMismatch(message: string, field?: string) {
    return new ApiError("MEDIA_MISMATCH", message, field);
  }

  static extractionFailed() {
    return new ApiError("EXTRACTION_FAILED", EXTRACTION_FAILED_MESSAGE);
  }

  static unauthorized(message = "Sign in to continue.") {
    return new ApiError("UNAUTHENTICATED", message);
  }

  static internal(message = "Internal error.") {
    return new ApiError("INTERNAL", message);
  }
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
    requestId: string;
  };
}

export function createRequestId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function toErrorBody(err: unknown, requestId: string): ErrorBody {
  if (err instanceof ApiError) {
    return {
      error: {
        code: err.code,
        message: err.message,
        ...(err.field ? { field: err.field } : {}),
        requestId,
      },
    };
  }

  return {
    error: {
      code: "INTERNAL",
      message: "Internal error.",
      requestId,
    },
  };
}

export function toErrorStatus(err: unknown): number {
  return err instanceof ApiError ? err.status : ERROR_STATUS.INTERNAL;
}
