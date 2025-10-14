import type {
  OpenRouterConfig,
  ChatOptions,
  ChatResponse,
  OpenRouterRequestBody,
  OpenRouterResponse,
  Message,
} from "./openrouter.types";

import {
  OpenRouterConfigError,
  OpenRouterNetworkError,
  OpenRouterAPIError,
  OpenRouterRateLimitError,
  OpenRouterValidationError,
  OpenRouterTimeoutError,
} from "./openrouter.errors";

export class OpenRouterService {
  private readonly config: Required<OpenRouterConfig>;

  constructor(config: OpenRouterConfig) {
    // Walidacja i normalizacja konfiguracji
    this.validateConfig(config);

    this.config = {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl ?? "https://openrouter.ai/api/v1",
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      siteUrl: config.siteUrl ?? "",
      appName: config.appName ?? "10x-cards",
    };
  }

  /**
   * Główna metoda do komunikacji z modelami LLM
   */
  async chat<T = unknown>(options: ChatOptions<T>): Promise<ChatResponse<T>> {
    // Walidacja opcji
    this.validateChatOptions(options);

    // Budowanie request body
    const requestBody = this.buildRequestBody(options);

    // Wykonanie request z retry logic
    const response = await this.makeRequest(requestBody);

    // Parsowanie i walidacja odpowiedzi
    return this.parseResponse<T>(response, options.responseFormat);
  }

  /**
   * Zmiana modelu
   */
  setModel(model: string): void {
    if (!model || typeof model !== "string") {
      throw new OpenRouterConfigError("Model must be a non-empty string");
    }
    this.config.model = model;
  }

  /**
   * Pobranie aktualnego modelu
   */
  getModel(): string {
    return this.config.model;
  }

  // ============================================================
  // METODY PRYWATNE
  // ============================================================

  /**
   * Walidacja konfiguracji
   */
  private validateConfig(config: OpenRouterConfig): void {
    if (!config.apiKey || typeof config.apiKey !== "string") {
      throw new OpenRouterConfigError("API key is required and must be a string");
    }

    if (!config.model || typeof config.model !== "string") {
      throw new OpenRouterConfigError("Model is required and must be a string");
    }

    if (config.timeout !== undefined && (config.timeout <= 0 || !Number.isFinite(config.timeout))) {
      throw new OpenRouterConfigError("Timeout must be a positive number");
    }

    if (config.maxRetries !== undefined && (config.maxRetries < 0 || !Number.isInteger(config.maxRetries))) {
      throw new OpenRouterConfigError("Max retries must be a non-negative integer");
    }

    if (config.retryDelay !== undefined && (config.retryDelay < 0 || !Number.isFinite(config.retryDelay))) {
      throw new OpenRouterConfigError("Retry delay must be a non-negative number");
    }

    if (config.baseUrl) {
      try {
        const url = new URL(config.baseUrl);
        if (url.protocol !== "https:") {
          throw new OpenRouterConfigError("Base URL must use HTTPS protocol");
        }
      } catch {
        throw new OpenRouterConfigError("Base URL must be a valid URL");
      }
    }
  }

  /**
   * Walidacja opcji chat
   */
  private validateChatOptions<T>(options: ChatOptions<T>): void {
    // Sprawdź że mamy albo messages, albo userMessage
    if (!options.messages && !options.userMessage) {
      throw new OpenRouterConfigError("Either messages or userMessage must be provided");
    }

    // Walidacja userMessage jeśli podano
    if (options.userMessage !== undefined) {
      if (typeof options.userMessage !== "string" || options.userMessage.length === 0) {
        throw new OpenRouterConfigError("User message must be a non-empty string");
      }

      if (options.userMessage.length > 100000) {
        throw new OpenRouterConfigError("User message too long (max 100000 characters)");
      }
    }

    // Walidacja systemMessage jeśli podano
    if (options.systemMessage !== undefined) {
      if (typeof options.systemMessage !== "string") {
        throw new OpenRouterConfigError("System message must be a string");
      }
    }

    // Walidacja messages jeśli podano
    if (options.messages) {
      if (!Array.isArray(options.messages) || options.messages.length === 0) {
        throw new OpenRouterConfigError("Messages must be a non-empty array");
      }

      for (const message of options.messages) {
        if (!message.role || !["system", "user", "assistant"].includes(message.role)) {
          throw new OpenRouterConfigError("Invalid message role");
        }
        if (typeof message.content !== "string") {
          throw new OpenRouterConfigError("Message content must be a string");
        }
      }
    }

    // Walidacja parametrów modelu
    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw new OpenRouterConfigError("Temperature must be between 0 and 2");
      }
    }

    if (options.maxTokens !== undefined) {
      if (options.maxTokens <= 0 || !Number.isInteger(options.maxTokens)) {
        throw new OpenRouterConfigError("Max tokens must be a positive integer");
      }
    }

    if (options.topP !== undefined) {
      if (options.topP < 0 || options.topP > 1) {
        throw new OpenRouterConfigError("Top P must be between 0 and 1");
      }
    }

    if (options.frequencyPenalty !== undefined) {
      if (options.frequencyPenalty < -2 || options.frequencyPenalty > 2) {
        throw new OpenRouterConfigError("Frequency penalty must be between -2 and 2");
      }
    }

    if (options.presencePenalty !== undefined) {
      if (options.presencePenalty < -2 || options.presencePenalty > 2) {
        throw new OpenRouterConfigError("Presence penalty must be between -2 and 2");
      }
    }
  }

  /**
   * Budowanie request body
   */
  private buildRequestBody<T>(options: ChatOptions<T>): OpenRouterRequestBody {
    // Budowanie messages array
    let messages: Message[];

    if (options.messages) {
      messages = options.messages;
    } else {
      messages = [];

      if (options.systemMessage) {
        messages.push({
          role: "system",
          content: options.systemMessage,
        });
      }

      if (options.userMessage) {
        messages.push({
          role: "user",
          content: options.userMessage,
        });
      }
    }

    // Bazowy request body
    const body: OpenRouterRequestBody = {
      model: options.model ?? this.config.model,
      messages,
    };

    // Dodanie response_format jeśli podano
    if (options.responseFormat) {
      body.response_format = options.responseFormat;
    }

    // Dodanie parametrów modelu
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }

    if (options.topP !== undefined) {
      body.top_p = options.topP;
    }

    if (options.topK !== undefined) {
      body.top_k = options.topK;
    }

    if (options.frequencyPenalty !== undefined) {
      body.frequency_penalty = options.frequencyPenalty;
    }

    if (options.presencePenalty !== undefined) {
      body.presence_penalty = options.presencePenalty;
    }

    if (options.stop !== undefined) {
      body.stop = options.stop;
    }

    return body;
  }

  /**
   * Wykonanie HTTP request z retry logic
   */
  private async makeRequest(body: OpenRouterRequestBody, attempt = 1): Promise<OpenRouterResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;

    // Przygotowanie headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.config.siteUrl) {
      headers["HTTP-Referer"] = this.config.siteUrl;
    }

    if (this.config.appName) {
      headers["X-Title"] = this.config.appName;
    }

    // Timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Wykonanie request
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Sprawdzenie statusu
      if (!response.ok) {
        return await this.handleErrorResponse(response, body, attempt);
      }

      // Parsowanie odpowiedzi
      const data = (await response.json()) as OpenRouterResponse;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Timeout error
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterTimeoutError(`Request timeout after ${this.config.timeout}ms`, this.config.timeout);
      }

      // Network error z retry
      if (attempt < this.config.maxRetries) {
        await this.delay(this.calculateBackoff(attempt));
        return this.makeRequest(body, attempt + 1);
      }

      this.logError(error as Error, { attempt, body });
      throw new OpenRouterNetworkError("Network request failed", error);
    }
  }

  /**
   * Obsługa błędów odpowiedzi HTTP
   */
  private async handleErrorResponse(
    response: Response,
    body: OpenRouterRequestBody,
    attempt: number
  ): Promise<OpenRouterResponse> {
    const status = response.status;

    // Próba pobrania szczegółów błędu
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: response.statusText } };
    }

    // Rate limiting - retry
    if (status === 429) {
      if (attempt < this.config.maxRetries) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.calculateBackoff(attempt);

        await this.delay(delay);
        return this.makeRequest(body, attempt + 1);
      }

      throw new OpenRouterRateLimitError(
        errorData.error?.message || "Rate limit exceeded",
        parseInt(response.headers.get("Retry-After") || "0")
      );
    }

    // Server errors - retry
    if (status >= 500 && attempt < this.config.maxRetries) {
      await this.delay(this.calculateBackoff(attempt));
      return this.makeRequest(body, attempt + 1);
    }

    // Inne błędy API
    const errorMessage = errorData.error?.message || `API request failed with status ${status}`;
    this.logError(new Error(errorMessage), { status, errorData, body });

    throw new OpenRouterAPIError(errorMessage, status, errorData);
  }

  /**
   * Parsowanie odpowiedzi z API
   */
  private parseResponse<T>(
    response: OpenRouterResponse,
    responseFormat?: ChatOptions<T>["responseFormat"]
  ): ChatResponse<T> {
    // Sprawdzenie podstawowej struktury
    if (!response.choices || response.choices.length === 0) {
      throw new OpenRouterValidationError("Invalid response: no choices returned");
    }

    const choice = response.choices[0];
    const rawContent = choice.message.content;

    // Parsowanie content jeśli jest response_format
    let content: T;

    if (responseFormat) {
      try {
        content = JSON.parse(rawContent) as T;

        // Opcjonalna walidacja ze schematem (można dodać Zod)
        // const result = schema.safeParse(content);
        // if (!result.success) {
        //   throw new OpenRouterValidationError(
        //     'Response validation failed',
        //     result.error.errors
        //   );
        // }
      } catch (error) {
        this.logError(error as Error, { rawContent, responseFormat });
        throw new OpenRouterValidationError("Failed to parse JSON response", error);
      }
    } else {
      content = rawContent as T;
    }

    return {
      content,
      rawContent,
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
    };
  }

  /**
   * Mapowanie finish_reason
   */
  private mapFinishReason(reason: string): ChatResponse["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "content_filter":
        return "content_filter";
      default:
        return "error";
    }
  }

  /**
   * Obliczanie backoff dla retry
   */
  private calculateBackoff(attempt: number): number {
    return this.config.retryDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Opóźnienie
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Logowanie błędów
   */
  private logError(error: Error, context: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.error("OpenRouter Error:", {
      name: error.name,
      message: error.message,
      context: {
        ...context,
        // Ukryj wrażliwe dane
        apiKey: this.config.apiKey ? "***" : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
