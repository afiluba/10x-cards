// Konfiguracja serwisu
export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  siteUrl?: string; // Dla rankings na OpenRouter
  appName?: string; // Nazwa aplikacji
}

// Wiadomość w czacie
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// JSON Schema type
export type JSONSchemaType = "string" | "number" | "boolean" | "object" | "array" | "null";

export interface JSONSchema {
  type: JSONSchemaType | JSONSchemaType[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
  enum?: unknown[];
  additionalProperties?: boolean | JSONSchema;
  [key: string]: unknown;
}

// Response format
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: JSONSchema;
  };
}

// Opcje dla metody chat
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ChatOptions<T = unknown> {
  // Wiadomości
  systemMessage?: string;
  userMessage?: string;
  messages?: Message[];

  // Format odpowiedzi
  responseFormat?: ResponseFormat;

  // Parametry modelu
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];

  // Nadpisanie konfiguracji
  model?: string;
}

// Odpowiedź z API
export interface ChatResponse<T = unknown> {
  content: T;
  rawContent: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | "error";
}

// Wewnętrzne typy dla komunikacji z API
export interface OpenRouterRequestBody {
  model: string;
  messages: Message[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Informacje o modelu
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  context_length: number;
}
