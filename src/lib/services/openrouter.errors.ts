export class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }
}

export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "OpenRouterConfigError";
    Object.setPrototypeOf(this, OpenRouterConfigError.prototype);
  }
}

export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string, originalError?: unknown) {
    super(message, "NETWORK_ERROR", undefined, originalError);
    this.name = "OpenRouterNetworkError";
    Object.setPrototypeOf(this, OpenRouterNetworkError.prototype);
  }
}

export class OpenRouterAPIError extends OpenRouterError {
  constructor(
    message: string,
    statusCode: number,
    public apiResponse?: unknown
  ) {
    super(message, "API_ERROR", statusCode);
    this.name = "OpenRouterAPIError";
    Object.setPrototypeOf(this, OpenRouterAPIError.prototype);
  }
}

export class OpenRouterRateLimitError extends OpenRouterAPIError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, 429);
    this.name = "OpenRouterRateLimitError";
    Object.setPrototypeOf(this, OpenRouterRateLimitError.prototype);
  }
}

export class OpenRouterValidationError extends OpenRouterError {
  constructor(
    message: string,
    public validationErrors?: unknown
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "OpenRouterValidationError";
    Object.setPrototypeOf(this, OpenRouterValidationError.prototype);
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(
    message: string,
    public timeoutMs: number
  ) {
    super(message, "TIMEOUT_ERROR");
    this.name = "OpenRouterTimeoutError";
    Object.setPrototypeOf(this, OpenRouterTimeoutError.prototype);
  }
}
