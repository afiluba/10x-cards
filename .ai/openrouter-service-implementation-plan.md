# Plan Wdrożenia Usługi OpenRouter

## 1. Opis Usługi

Usługa OpenRouter (`OpenRouterService`) jest warstwą abstrakcji do komunikacji z API OpenRouter.ai, która zapewnia:

- **Typowaną komunikację z modelami LLM** - wykorzystanie TypeScript do zapewnienia type safety
- **Ustrukturyzowane odpowiedzi** - wymuszanie określonego formatu JSON za pomocą `response_format`
- **Elastyczną konfigurację** - możliwość wyboru modelu i parametrów generacji
- **Solidną obsługę błędów** - retry logic, timeout handling, error recovery
- **Bezpieczne zarządzanie kluczami API** - wykorzystanie zmiennych środowiskowych

### Umiejscowienie w Projekcie

Zgodnie ze strukturą projektu, usługa zostanie umieszczona w:
- **Plik**: `./src/lib/services/openrouter.service.ts`
- **Schematy**: `./src/lib/schemas/openrouter.schemas.ts` (jeśli potrzebne)
- **Typy**: Wykorzystanie `./src/types.ts` dla współdzielonych typów

## 2. Opis Konstruktora

### Parametry Konstruktora

```typescript
interface OpenRouterConfig {
  apiKey: string;              // Klucz API OpenRouter
  model: string;               // Nazwa modelu (np. "anthropic/claude-3.5-sonnet")
  baseUrl?: string;            // Domyślnie: "https://openrouter.ai/api/v1"
  timeout?: number;            // Timeout w ms (domyślnie: 30000)
  maxRetries?: number;         // Maksymalna liczba prób (domyślnie: 3)
  retryDelay?: number;         // Opóźnienie między próbami w ms (domyślnie: 1000)
}
```

### Przykład Użycia Konstruktora

```typescript
const openRouterService = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  model: "anthropic/claude-3.5-sonnet",
  timeout: 60000,
  maxRetries: 3
});
```

### Walidacja w Konstruktorze

Konstruktor powinien walidować:
1. Obecność i format klucza API
2. Poprawność nazwy modelu
3. Wartości numeryczne (timeout, maxRetries) są dodatnie
4. baseUrl jest poprawnym URL

## 3. Publiczne Metody i Pola

### 3.1. Metoda `chat()`

Główna metoda do wysyłania zapytań do modelu LLM.

```typescript
async chat<T = unknown>(options: ChatOptions<T>): Promise<ChatResponse<T>>
```

#### Interfejs `ChatOptions<T>`

```typescript
interface ChatOptions<T> {
  // Wiadomości
  systemMessage?: string;
  userMessage: string;
  messages?: Message[];        // Opcjonalna pełna historia czatu
  
  // Konfiguracja odpowiedzi
  responseFormat?: ResponseFormat<T>;
  
  // Parametry modelu
  temperature?: number;        // 0.0 - 2.0, domyślnie: 1.0
  maxTokens?: number;          // Maksymalna liczba tokenów w odpowiedzi
  topP?: number;               // 0.0 - 1.0, nucleus sampling
  topK?: number;               // Top-k sampling
  frequencyPenalty?: number;   // -2.0 - 2.0, domyślnie: 0
  presencePenalty?: number;    // -2.0 - 2.0, domyślnie: 0
  stop?: string[];             // Sekwencje stopu
  
  // Nadpisanie konfiguracji
  model?: string;              // Nadpisanie modelu z konstruktora
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ResponseFormat<T> {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: JSONSchema<T>;
  };
}
```

#### Interfejs `ChatResponse<T>`

```typescript
interface ChatResponse<T> {
  content: T;                  // Sparsowana odpowiedź zgodna ze schematem
  rawContent: string;          // Surowa odpowiedź tekstowa
  model: string;               // Model użyty do generacji
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
}
```

#### Przykład Użycia z `response_format`

```typescript
// 1. Definiowanie schematu TypeScript
interface FlashcardProposal {
  front: string;
  back: string;
  tags: string[];
}

// 2. Definiowanie JSON Schema
const flashcardSchema = {
  type: 'object',
  properties: {
    front: {
      type: 'string',
      description: 'Pytanie na przedniej stronie fiszki'
    },
    back: {
      type: 'string',
      description: 'Odpowiedź na tylnej stronie fiszki'
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tagi do kategoryzacji fiszki'
    }
  },
  required: ['front', 'back', 'tags'],
  additionalProperties: false
} as const;

// 3. Wywołanie metody chat z response_format
const response = await openRouterService.chat<FlashcardProposal>({
  systemMessage: 'Jesteś ekspertem w tworzeniu fiszek edukacyjnych.',
  userMessage: 'Stwórz fiszkę na temat fotosynezy.',
  responseFormat: {
    type: 'json_schema',
    json_schema: {
      name: 'flashcard_proposal',
      strict: true,
      schema: flashcardSchema
    }
  },
  temperature: 0.7,
  maxTokens: 500
});

// response.content jest typu FlashcardProposal
console.log(response.content.front);
console.log(response.content.back);
console.log(response.content.tags);
```

### 3.2. Metoda `chatStream()`

Opcjonalna metoda dla streaming responses (do rozważenia w przyszłości).

```typescript
async *chatStream<T>(options: ChatOptions<T>): AsyncGenerator<ChatStreamChunk<T>>
```

### 3.3. Metoda `setModel()`

Zmiana modelu bez tworzenia nowej instancji.

```typescript
setModel(model: string): void
```

### 3.4. Metoda `getAvailableModels()`

Pobieranie listy dostępnych modeli (opcjonalne).

```typescript
async getAvailableModels(): Promise<ModelInfo[]>
```

## 4. Prywatne Metody i Pola

### 4.1. Pola Prywatne

```typescript
private readonly config: Required<OpenRouterConfig>;
private readonly httpClient: typeof fetch;
```

### 4.2. Metoda `buildRequestBody()`

Budowanie body dla żądania HTTP.

```typescript
private buildRequestBody<T>(options: ChatOptions<T>): OpenRouterRequestBody
```

**Logika:**
1. Konstruowanie tablicy messages:
   - Jeśli podano `messages`, użyj ich
   - W przeciwnym razie zbuduj z `systemMessage` i `userMessage`
2. Dodanie `response_format` jeśli podano
3. Dołączenie parametrów modelu (temperature, max_tokens, etc.)
4. Walidacja że wszystkie wymagane pola są obecne

**Przykładowy Output:**

```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [
    {
      "role": "system",
      "content": "Jesteś ekspertem w tworzeniu fiszek edukacyjnych."
    },
    {
      "role": "user",
      "content": "Stwórz fiszkę na temat fotosynezy."
    }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "flashcard_proposal",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "front": { "type": "string" },
          "back": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["front", "back", "tags"],
        "additionalProperties": false
      }
    }
  },
  "temperature": 0.7,
  "max_tokens": 500
}
```

### 4.3. Metoda `makeRequest()`

Wykonanie HTTP request z retry logic.

```typescript
private async makeRequest(
  body: OpenRouterRequestBody,
  attempt: number = 1
): Promise<OpenRouterResponse>
```

**Logika:**
1. Wykonanie POST request do `${baseUrl}/chat/completions`
2. Headers:
   - `Authorization: Bearer ${apiKey}`
   - `Content-Type: application/json`
   - `HTTP-Referer: ${siteUrl}` (opcjonalne, dla rankings na OpenRouter)
   - `X-Title: ${appName}` (opcjonalne)
3. Obsługa timeout
4. Sprawdzenie statusu odpowiedzi
5. Jeśli błąd i attempt < maxRetries, retry z exponential backoff
6. Zwrócenie sparsowanej odpowiedzi

**Retry Logic:**
- Retry dla kodów: 429 (Rate Limit), 500, 502, 503, 504
- Opóźnienie: `retryDelay * Math.pow(2, attempt - 1)`
- Maksymalnie `maxRetries` prób

### 4.4. Metoda `parseResponse()`

Parsowanie i walidacja odpowiedzi z API.

```typescript
private parseResponse<T>(
  response: OpenRouterResponse,
  responseFormat?: ResponseFormat<T>
): ChatResponse<T>
```

**Logika:**
1. Ekstrakcja content z `response.choices[0].message.content`
2. Jeśli `responseFormat` podano:
   - Parse JSON z content
   - Walidacja względem schema (opcjonalnie z Zod)
   - Rzucenie błędu jeśli walidacja nie powiedzie się
3. Ekstrakcja usage statistics
4. Zwrócenie `ChatResponse<T>`

### 4.5. Metoda `validateConfig()`

Walidacja konfiguracji w konstruktorze.

```typescript
private validateConfig(config: OpenRouterConfig): void
```

**Sprawdzenia:**
1. `apiKey` nie jest pusty
2. `model` nie jest pusty
3. `timeout` > 0
4. `maxRetries` >= 0
5. `retryDelay` >= 0
6. `baseUrl` jest poprawnym URL (jeśli podano)

## 5. Obsługa Błędów

### 5.1. Hierarchia Błędów

```typescript
// Bazowa klasa błędu
class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

// Błąd konfiguracji
class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'OpenRouterConfigError';
  }
}

// Błąd sieciowy
class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, originalError);
    this.name = 'OpenRouterNetworkError';
  }
}

// Błąd API (4xx, 5xx)
class OpenRouterAPIError extends OpenRouterError {
  constructor(message: string, statusCode: number, public apiResponse?: unknown) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'OpenRouterAPIError';
  }
}

// Błąd rate limiting
class OpenRouterRateLimitError extends OpenRouterAPIError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, 429);
    this.name = 'OpenRouterRateLimitError';
  }
}

// Błąd walidacji odpowiedzi
class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string, public validationErrors?: unknown) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'OpenRouterValidationError';
  }
}

// Błąd timeout
class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string, public timeoutMs: number) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'OpenRouterTimeoutError';
  }
}
```

### 5.2. Scenariusze Błędów

#### Scenariusz 1: Nieprawidłowa konfiguracja
**Kiedy:** Brak API key, nieprawidłowy model, błędne wartości parametrów
**Odpowiedź:** Rzuć `OpenRouterConfigError` w konstruktorze
**Przykład:**
```typescript
if (!config.apiKey) {
  throw new OpenRouterConfigError('API key is required');
}
```

#### Scenariusz 2: Błąd sieci
**Kiedy:** Brak połączenia, DNS failure, connection timeout
**Odpowiedź:** Rzuć `OpenRouterNetworkError` po wyczerpaniu retry
**Przykład:**
```typescript
try {
  const response = await fetch(url, options);
} catch (error) {
  if (attempt < maxRetries) {
    return this.makeRequest(body, attempt + 1);
  }
  throw new OpenRouterNetworkError('Network request failed', error);
}
```

#### Scenariusz 3: Rate Limiting (429)
**Kiedy:** Przekroczono limit requestów
**Odpowiedź:** Retry z exponential backoff lub rzuć `OpenRouterRateLimitError`
**Przykład:**
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  if (attempt < maxRetries) {
    await this.delay(this.calculateBackoff(attempt, retryAfter));
    return this.makeRequest(body, attempt + 1);
  }
  throw new OpenRouterRateLimitError(
    'Rate limit exceeded',
    retryAfter ? parseInt(retryAfter) : undefined
  );
}
```

#### Scenariusz 4: API Error (4xx, 5xx)
**Kiedy:** Invalid request, server error, model unavailable
**Odpowiedź:** Rzuć `OpenRouterAPIError` z details
**Przykład:**
```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new OpenRouterAPIError(
    errorData.error?.message || 'API request failed',
    response.status,
    errorData
  );
}
```

#### Scenariusz 5: Błąd parsowania/walidacji odpowiedzi
**Kiedy:** Odpowiedź nie zgadza się ze schematem, invalid JSON
**Odpowiedź:** Rzuć `OpenRouterValidationError`
**Przykład:**
```typescript
try {
  const parsed = JSON.parse(content);
  // Walidacja z Zod
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new OpenRouterValidationError(
      'Response validation failed',
      result.error.errors
    );
  }
  return result.data;
} catch (error) {
  throw new OpenRouterValidationError(
    'Failed to parse response',
    error
  );
}
```

#### Scenariusz 6: Timeout
**Kiedy:** Request przekracza skonfigurowany timeout
**Odpowiedź:** Rzuć `OpenRouterTimeoutError`
**Przykład:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  });
} catch (error) {
  if (error.name === 'AbortError') {
    throw new OpenRouterTimeoutError(
      `Request timeout after ${this.config.timeout}ms`,
      this.config.timeout
    );
  }
  throw error;
} finally {
  clearTimeout(timeoutId);
}
```

### 5.3. Error Logging

Wszystkie błędy powinny być logowane z kontekstem:

```typescript
private logError(error: Error, context: Record<string, unknown>): void {
  console.error('OpenRouter Error:', {
    name: error.name,
    message: error.message,
    code: (error as OpenRouterError).code,
    statusCode: (error as OpenRouterError).statusCode,
    context,
    timestamp: new Date().toISOString()
  });
}
```

## 6. Kwestie Bezpieczeństwa

### 6.1. Zarządzanie Kluczami API

#### ✅ DOBRE PRAKTYKI

1. **Zmienne środowiskowe:**
```typescript
// astro.config.mjs
export default defineConfig({
  vite: {
    define: {
      'import.meta.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY)
    }
  }
});
```

2. **Użycie tylko w backend/API routes:**
```typescript
// src/pages/api/generate.ts
import { OpenRouterService } from '@/lib/services/openrouter.service';

export async function POST({ request }) {
  const service = new OpenRouterService({
    apiKey: import.meta.env.OPENROUTER_API_KEY,
    model: 'anthropic/claude-3.5-sonnet'
  });
  
  // ... użycie serwisu
}
```

3. **Nie eksponowanie klucza w client-side code:**
```typescript
// ❌ NIGDY TAK NIE RÓB - to jest client-side component
export function ClientComponent() {
  const apiKey = import.meta.env.OPENROUTER_API_KEY; // ZŁE!
}
```

#### ❌ ZŁE PRAKTYKI

1. Hardcodowanie kluczy w kodzie
2. Używanie kluczy w komponentach React/client-side
3. Commitowanie plików .env do repozytorium
4. Logowanie kluczy API w konsoli/logach

### 6.2. Walidacja Input

Wszystkie inputy użytkownika muszą być walidowane przed wysłaniem do API:

```typescript
function validateUserMessage(message: string): void {
  if (!message || typeof message !== 'string') {
    throw new OpenRouterConfigError('User message must be a non-empty string');
  }
  
  if (message.length > 100000) {
    throw new OpenRouterConfigError('User message too long (max 100000 characters)');
  }
  
  // Sanityzacja jeśli potrzebna
}
```

### 6.3. Rate Limiting po Stronie Klienta

Implementacja prostego rate limitera:

```typescript
class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      throw new OpenRouterRateLimitError(
        `Rate limit exceeded. Try again in ${waitTime}ms`,
        waitTime
      );
    }
    
    this.requests.push(now);
  }
}

// W konstruktorze OpenRouterService
private rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
```

### 6.4. Sanityzacja Response

Jeśli response zawiera user-generated content, sanityzuj przed renderowaniem:

```typescript
import DOMPurify from 'dompurify';

function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content);
}
```

### 6.5. HTTPS Only

Upewnij się, że komunikacja z OpenRouter odbywa się tylko przez HTTPS:

```typescript
private validateConfig(config: OpenRouterConfig): void {
  if (config.baseUrl && !config.baseUrl.startsWith('https://')) {
    throw new OpenRouterConfigError('Base URL must use HTTPS');
  }
}
```

## 7. Plan Wdrożenia Krok Po Kroku

### Krok 1: Przygotowanie Środowiska

#### 1.1. Instalacja Zależności

```bash
# Nie są potrzebne dodatkowe zależności - używamy native fetch API
# Opcjonalnie dla walidacji:
npm install zod
npm install -D @types/node
```

#### 1.2. Konfiguracja Zmiennych Środowiskowych

Dodaj do `.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

Dodaj do `.gitignore`:
```
.env
.env.local
```

Stwórz `.env.example`:
```env
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

#### 1.3. Konfiguracja TypeScript

Upewnij się że `tsconfig.json` zawiera:
```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Krok 2: Utworzenie Struktur Typów

#### 2.1. Stworzenie pliku `src/lib/services/openrouter.types.ts`

```typescript
// Konfiguracja serwisu
export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  siteUrl?: string;      // Dla rankings na OpenRouter
  appName?: string;      // Nazwa aplikacji
}

// Wiadomość w czacie
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// JSON Schema type
export type JSONSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

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
export interface ResponseFormat<T = unknown> {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: JSONSchema;
  };
}

// Opcje dla metody chat
export interface ChatOptions<T = unknown> {
  // Wiadomości
  systemMessage?: string;
  userMessage?: string;
  messages?: Message[];
  
  // Format odpowiedzi
  responseFormat?: ResponseFormat<T>;
  
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
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
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
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
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
```

### Krok 3: Utworzenie Klas Błędów

#### 3.1. Stworzenie pliku `src/lib/services/openrouter.errors.ts`

```typescript
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'OpenRouterError';
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }
}

export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'OpenRouterConfigError';
    Object.setPrototypeOf(this, OpenRouterConfigError.prototype);
  }
}

export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, originalError);
    this.name = 'OpenRouterNetworkError';
    Object.setPrototypeOf(this, OpenRouterNetworkError.prototype);
  }
}

export class OpenRouterAPIError extends OpenRouterError {
  constructor(
    message: string,
    statusCode: number,
    public apiResponse?: unknown
  ) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'OpenRouterAPIError';
    Object.setPrototypeOf(this, OpenRouterAPIError.prototype);
  }
}

export class OpenRouterRateLimitError extends OpenRouterAPIError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, 429);
    this.name = 'OpenRouterRateLimitError';
    Object.setPrototypeOf(this, OpenRouterRateLimitError.prototype);
  }
}

export class OpenRouterValidationError extends OpenRouterError {
  constructor(
    message: string,
    public validationErrors?: unknown
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'OpenRouterValidationError';
    Object.setPrototypeOf(this, OpenRouterValidationError.prototype);
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string, public timeoutMs: number) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'OpenRouterTimeoutError';
    Object.setPrototypeOf(this, OpenRouterTimeoutError.prototype);
  }
}
```

### Krok 4: Implementacja Głównej Klasy Serwisu

#### 4.1. Stworzenie pliku `src/lib/services/openrouter.service.ts`

```typescript
import type {
  OpenRouterConfig,
  ChatOptions,
  ChatResponse,
  OpenRouterRequestBody,
  OpenRouterResponse,
  Message,
} from './openrouter.types';

import {
  OpenRouterConfigError,
  OpenRouterNetworkError,
  OpenRouterAPIError,
  OpenRouterRateLimitError,
  OpenRouterValidationError,
  OpenRouterTimeoutError,
} from './openrouter.errors';

export class OpenRouterService {
  private readonly config: Required<OpenRouterConfig>;

  constructor(config: OpenRouterConfig) {
    // Walidacja i normalizacja konfiguracji
    this.validateConfig(config);
    
    this.config = {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl ?? 'https://openrouter.ai/api/v1',
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      siteUrl: config.siteUrl ?? '',
      appName: config.appName ?? '10x-cards',
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
    if (!model || typeof model !== 'string') {
      throw new OpenRouterConfigError('Model must be a non-empty string');
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
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new OpenRouterConfigError('API key is required and must be a string');
    }

    if (!config.model || typeof config.model !== 'string') {
      throw new OpenRouterConfigError('Model is required and must be a string');
    }

    if (config.timeout !== undefined && (config.timeout <= 0 || !Number.isFinite(config.timeout))) {
      throw new OpenRouterConfigError('Timeout must be a positive number');
    }

    if (config.maxRetries !== undefined && (config.maxRetries < 0 || !Number.isInteger(config.maxRetries))) {
      throw new OpenRouterConfigError('Max retries must be a non-negative integer');
    }

    if (config.retryDelay !== undefined && (config.retryDelay < 0 || !Number.isFinite(config.retryDelay))) {
      throw new OpenRouterConfigError('Retry delay must be a non-negative number');
    }

    if (config.baseUrl) {
      try {
        const url = new URL(config.baseUrl);
        if (url.protocol !== 'https:') {
          throw new OpenRouterConfigError('Base URL must use HTTPS protocol');
        }
      } catch {
        throw new OpenRouterConfigError('Base URL must be a valid URL');
      }
    }
  }

  /**
   * Walidacja opcji chat
   */
  private validateChatOptions<T>(options: ChatOptions<T>): void {
    // Sprawdź że mamy albo messages, albo userMessage
    if (!options.messages && !options.userMessage) {
      throw new OpenRouterConfigError('Either messages or userMessage must be provided');
    }

    // Walidacja userMessage jeśli podano
    if (options.userMessage !== undefined) {
      if (typeof options.userMessage !== 'string' || options.userMessage.length === 0) {
        throw new OpenRouterConfigError('User message must be a non-empty string');
      }
      
      if (options.userMessage.length > 100000) {
        throw new OpenRouterConfigError('User message too long (max 100000 characters)');
      }
    }

    // Walidacja systemMessage jeśli podano
    if (options.systemMessage !== undefined) {
      if (typeof options.systemMessage !== 'string') {
        throw new OpenRouterConfigError('System message must be a string');
      }
    }

    // Walidacja messages jeśli podano
    if (options.messages) {
      if (!Array.isArray(options.messages) || options.messages.length === 0) {
        throw new OpenRouterConfigError('Messages must be a non-empty array');
      }

      for (const message of options.messages) {
        if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
          throw new OpenRouterConfigError('Invalid message role');
        }
        if (typeof message.content !== 'string') {
          throw new OpenRouterConfigError('Message content must be a string');
        }
      }
    }

    // Walidacja parametrów modelu
    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw new OpenRouterConfigError('Temperature must be between 0 and 2');
      }
    }

    if (options.maxTokens !== undefined) {
      if (options.maxTokens <= 0 || !Number.isInteger(options.maxTokens)) {
        throw new OpenRouterConfigError('Max tokens must be a positive integer');
      }
    }

    if (options.topP !== undefined) {
      if (options.topP < 0 || options.topP > 1) {
        throw new OpenRouterConfigError('Top P must be between 0 and 1');
      }
    }

    if (options.frequencyPenalty !== undefined) {
      if (options.frequencyPenalty < -2 || options.frequencyPenalty > 2) {
        throw new OpenRouterConfigError('Frequency penalty must be between -2 and 2');
      }
    }

    if (options.presencePenalty !== undefined) {
      if (options.presencePenalty < -2 || options.presencePenalty > 2) {
        throw new OpenRouterConfigError('Presence penalty must be between -2 and 2');
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
          role: 'system',
          content: options.systemMessage,
        });
      }
      
      if (options.userMessage) {
        messages.push({
          role: 'user',
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
  private async makeRequest(
    body: OpenRouterRequestBody,
    attempt: number = 1
  ): Promise<OpenRouterResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;

    // Przygotowanie headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.config.siteUrl) {
      headers['HTTP-Referer'] = this.config.siteUrl;
    }

    if (this.config.appName) {
      headers['X-Title'] = this.config.appName;
    }

    // Timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Wykonanie request
      const response = await fetch(url, {
        method: 'POST',
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
      const data = await response.json() as OpenRouterResponse;
      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      // Timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenRouterTimeoutError(
          `Request timeout after ${this.config.timeout}ms`,
          this.config.timeout
        );
      }

      // Network error z retry
      if (attempt < this.config.maxRetries) {
        await this.delay(this.calculateBackoff(attempt));
        return this.makeRequest(body, attempt + 1);
      }

      this.logError(error as Error, { attempt, body });
      throw new OpenRouterNetworkError('Network request failed', error);
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
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: response.statusText } };
    }

    // Rate limiting - retry
    if (status === 429) {
      if (attempt < this.config.maxRetries) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.calculateBackoff(attempt);
        
        await this.delay(delay);
        return this.makeRequest(body, attempt + 1);
      }

      throw new OpenRouterRateLimitError(
        errorData.error?.message || 'Rate limit exceeded',
        parseInt(response.headers.get('Retry-After') || '0')
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
    responseFormat?: ChatOptions<T>['responseFormat']
  ): ChatResponse<T> {
    // Sprawdzenie podstawowej struktury
    if (!response.choices || response.choices.length === 0) {
      throw new OpenRouterValidationError('Invalid response: no choices returned');
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
        throw new OpenRouterValidationError(
          'Failed to parse JSON response',
          error
        );
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
  private mapFinishReason(reason: string): ChatResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logowanie błędów
   */
  private logError(error: Error, context: Record<string, unknown>): void {
    console.error('OpenRouter Error:', {
      name: error.name,
      message: error.message,
      context: {
        ...context,
        // Ukryj wrażliwe dane
        apiKey: this.config.apiKey ? '***' : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Krok 5: Utworzenie Przykładowych Schematów

#### 5.1. Stworzenie pliku `src/lib/schemas/openrouter-examples.schemas.ts`

```typescript
import type { JSONSchema } from '../services/openrouter.types';

/**
 * Przykład 1: Schemat dla pojedynczej fiszki
 */
export interface FlashcardProposal {
  front: string;
  back: string;
  tags: string[];
}

export const flashcardProposalSchema: JSONSchema = {
  type: 'object',
  properties: {
    front: {
      type: 'string',
      description: 'Pytanie na przedniej stronie fiszki',
    },
    back: {
      type: 'string',
      description: 'Odpowiedź na tylnej stronie fiszki',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tagi do kategoryzacji fiszki',
    },
  },
  required: ['front', 'back', 'tags'],
  additionalProperties: false,
};

/**
 * Przykład 2: Schemat dla wielu fiszek
 */
export interface MultipleFlashcardsProposal {
  flashcards: FlashcardProposal[];
  summary: string;
}

export const multipleFlashcardsProposalSchema: JSONSchema = {
  type: 'object',
  properties: {
    flashcards: {
      type: 'array',
      items: flashcardProposalSchema,
      description: 'Lista wygenerowanych fiszek',
    },
    summary: {
      type: 'string',
      description: 'Krótkie podsumowanie wygenerowanych fiszek',
    },
  },
  required: ['flashcards', 'summary'],
  additionalProperties: false,
};

/**
 * Przykład 3: Schemat dla analizy tekstu
 */
export interface TextAnalysis {
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadingTime: number;
  keyPoints: string[];
}

export const textAnalysisSchema: JSONSchema = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: { type: 'string' },
      description: 'Główne tematy w tekście',
    },
    difficulty: {
      type: 'string',
      enum: ['beginner', 'intermediate', 'advanced'],
      description: 'Poziom trudności tekstu',
    },
    estimatedReadingTime: {
      type: 'number',
      description: 'Szacowany czas czytania w minutach',
    },
    keyPoints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Kluczowe punkty z tekstu',
    },
  },
  required: ['topics', 'difficulty', 'estimatedReadingTime', 'keyPoints'],
  additionalProperties: false,
};
```

### Krok 6: Utworzenie API Endpoint

#### 6.1. Stworzenie pliku `src/pages/api/openrouter/generate-flashcard.ts`

```typescript
import type { APIRoute } from 'astro';
import { OpenRouterService } from '@/lib/services/openrouter.service';
import {
  type FlashcardProposal,
  flashcardProposalSchema,
} from '@/lib/schemas/openrouter-examples.schemas';
import {
  OpenRouterError,
  OpenRouterConfigError,
  OpenRouterRateLimitError,
} from '@/lib/services/openrouter.errors';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Parsowanie request body
    const body = await request.json();
    const { topic, difficulty = 'intermediate' } = body;

    // 2. Walidacja input
    if (!topic || typeof topic !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Topic is required and must be a string',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Inicjalizacja serwisu
    const openRouterService = new OpenRouterService({
      apiKey: import.meta.env.OPENROUTER_API_KEY,
      model: import.meta.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet',
      timeout: 60000,
      maxRetries: 3,
    });

    // 4. Przygotowanie prompt
    const systemMessage = `Jesteś ekspertem w tworzeniu fiszek edukacyjnych. 
Twoje fiszki są:
- Zwięzłe i precyzyjne
- Sformułowane w języku polskim
- Dostosowane do poziomu: ${difficulty}
- Zawierają praktyczne przykłady`;

    const userMessage = `Stwórz fiszkę edukacyjną na temat: ${topic}

Zasady:
1. Pytanie powinno być jasne i konkretne
2. Odpowiedź powinna być zwięzła ale kompletna
3. Dodaj 2-3 tagi kategoryzujące tę fiszkę`;

    // 5. Wywołanie OpenRouter
    const response = await openRouterService.chat<FlashcardProposal>({
      systemMessage,
      userMessage,
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'flashcard_proposal',
          strict: true,
          schema: flashcardProposalSchema,
        },
      },
      temperature: 0.7,
      maxTokens: 500,
    });

    // 6. Zwrócenie odpowiedzi
    return new Response(
      JSON.stringify({
        flashcard: response.content,
        usage: response.usage,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    // Obsługa błędów
    console.error('Error generating flashcard:', error);

    if (error instanceof OpenRouterConfigError) {
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error instanceof OpenRouterRateLimitError) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: error.message,
          retryAfter: error.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(error.retryAfter || 60),
          },
        }
      );
    }

    if (error instanceof OpenRouterError) {
      return new Response(
        JSON.stringify({
          error: error.name,
          message: error.message,
          code: error.code,
        }),
        { status: error.statusCode || 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Nieznany błąd
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Krok 7: Testowanie

#### 7.1. Utworzenie strony testowej `src/pages/test-openrouter.astro`

```astro
---
// Możesz użyć tej strony do manualnego testowania podczas developmentu
---

<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test OpenRouter</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    input, select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    button {
      background: #0066cc;
      color: white;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    
    button:hover {
      background: #0052a3;
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .result {
      margin-top: 2rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
    
    .error {
      background: #fee;
      border: 1px solid #fcc;
    }
    
    .loading {
      color: #666;
    }
  </style>
</head>
<body>
  <h1>Test OpenRouter Service</h1>
  
  <form id="testForm">
    <div class="form-group">
      <label for="topic">Temat fiszki:</label>
      <input 
        type="text" 
        id="topic" 
        name="topic" 
        placeholder="np. fotosynteza"
        required
      />
    </div>
    
    <div class="form-group">
      <label for="difficulty">Poziom trudności:</label>
      <select id="difficulty" name="difficulty">
        <option value="beginner">Początkujący</option>
        <option value="intermediate" selected>Średniozaawansowany</option>
        <option value="advanced">Zaawansowany</option>
      </select>
    </div>
    
    <button type="submit" id="submitBtn">Generuj fiszkę</button>
  </form>
  
  <div id="result"></div>
  
  <script>
    const form = document.getElementById('testForm');
    const resultDiv = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = {
        topic: formData.get('topic'),
        difficulty: formData.get('difficulty'),
      };
      
      // UI feedback
      submitBtn.disabled = true;
      resultDiv.innerHTML = '<p class="loading">Generowanie fiszki...</p>';
      
      try {
        const response = await fetch('/api/openrouter/generate-flashcard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Request failed');
        }
        
        // Wyświetl wynik
        resultDiv.innerHTML = `
          <div class="result">
            <h2>Wygenerowana fiszka</h2>
            <p><strong>Przód:</strong> ${result.flashcard.front}</p>
            <p><strong>Tył:</strong> ${result.flashcard.back}</p>
            <p><strong>Tagi:</strong> ${result.flashcard.tags.join(', ')}</p>
            <hr>
            <p><small>
              Tokeny: ${result.usage.totalTokens} 
              (prompt: ${result.usage.promptTokens}, completion: ${result.usage.completionTokens})
            </small></p>
          </div>
        `;
        
      } catch (error) {
        resultDiv.innerHTML = `
          <div class="result error">
            <h2>Błąd</h2>
            <p>${error.message}</p>
          </div>
        `;
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>
```

#### 7.2. Testy manualne

1. **Uruchom dev server:**
```bash
npm run dev
```

2. **Odwiedź stronę testową:**
```
http://localhost:4321/test-openrouter
```

3. **Przetestuj różne scenariusze:**
   - Poprawne generowanie fiszki
   - Pusty topic (walidacja)
   - Różne poziomy trudności
   - Sprawdź response times
   - Sprawdź obsługę błędów (np. nieprawidłowy API key)

#### 7.3. Testy jednostkowe (opcjonalne)

Możesz stworzyć plik `src/lib/services/openrouter.service.test.ts` używając Vitest:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { OpenRouterService } from './openrouter.service';
import { OpenRouterConfigError } from './openrouter.errors';

describe('OpenRouterService', () => {
  describe('Constructor validation', () => {
    it('should throw error when API key is missing', () => {
      expect(() => {
        new OpenRouterService({
          apiKey: '',
          model: 'test-model',
        });
      }).toThrow(OpenRouterConfigError);
    });

    it('should throw error when model is missing', () => {
      expect(() => {
        new OpenRouterService({
          apiKey: 'test-key',
          model: '',
        });
      }).toThrow(OpenRouterConfigError);
    });

    it('should throw error when timeout is negative', () => {
      expect(() => {
        new OpenRouterService({
          apiKey: 'test-key',
          model: 'test-model',
          timeout: -1,
        });
      }).toThrow(OpenRouterConfigError);
    });

    it('should create service with valid config', () => {
      expect(() => {
        new OpenRouterService({
          apiKey: 'test-key',
          model: 'test-model',
        });
      }).not.toThrow();
    });
  });

  // Więcej testów...
});
```

### Krok 8: Integracja z Istniejącym Kodem

#### 8.1. Refaktoryzacja istniejącego AI service

Jeśli masz już jakiś AI service (np. `ai-generation.service.ts`), zrefaktoryzuj go aby używać `OpenRouterService`:

```typescript
// src/lib/services/ai-generation.service.ts
import { OpenRouterService } from './openrouter.service';
import type { FlashcardProposal } from '@/types';

export class AIGenerationService {
  private openRouter: OpenRouterService;

  constructor() {
    this.openRouter = new OpenRouterService({
      apiKey: import.meta.env.OPENROUTER_API_KEY,
      model: import.meta.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet',
      timeout: 60000,
    });
  }

  async generateFlashcards(
    userInput: string,
    count: number = 5
  ): Promise<FlashcardProposal[]> {
    const systemMessage = `Jesteś ekspertem w tworzeniu fiszek edukacyjnych...`;
    
    const userMessage = `Wygeneruj ${count} fiszek na podstawie: ${userInput}`;

    const response = await this.openRouter.chat<{ flashcards: FlashcardProposal[] }>({
      systemMessage,
      userMessage,
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'flashcards_batch',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              flashcards: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    front: { type: 'string' },
                    back: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['front', 'back', 'tags'],
                },
              },
            },
            required: ['flashcards'],
          },
        },
      },
      temperature: 0.7,
      maxTokens: 2000,
    });

    return response.content.flashcards;
  }
}
```

### Krok 9: Dokumentacja dla Zespołu

#### 9.1. Stworzenie README dla serwisu

Stwórz plik `src/lib/services/README.md`:

```markdown
# OpenRouter Service

## Użycie podstawowe

```typescript
import { OpenRouterService } from '@/lib/services/openrouter.service';

const service = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'anthropic/claude-3.5-sonnet'
});

const response = await service.chat({
  systemMessage: 'You are a helpful assistant.',
  userMessage: 'Hello!',
  temperature: 0.7
});

console.log(response.content);
```

## Structured Output

```typescript
interface MyData {
  name: string;
  age: number;
}

const response = await service.chat<MyData>({
  userMessage: 'Extract: John is 25 years old',
  responseFormat: {
    type: 'json_schema',
    json_schema: {
      name: 'person_data',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      }
    }
  }
});

// response.content jest typu MyData
```

## Obsługa błędów

```typescript
import { 
  OpenRouterError, 
  OpenRouterRateLimitError,
  OpenRouterTimeoutError 
} from '@/lib/services/openrouter.errors';

try {
  const response = await service.chat({ ... });
} catch (error) {
  if (error instanceof OpenRouterRateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof OpenRouterTimeoutError) {
    console.log('Request timed out');
  } else if (error instanceof OpenRouterError) {
    console.log(`Error: ${error.code} - ${error.message}`);
  }
}
```

## Dostępne modele

- `anthropic/claude-3.5-sonnet` - Najlepszy model Claude (rekomendowany)
- `openai/gpt-4o` - GPT-4 Omni
- `google/gemini-2.0-flash-exp:free` - Darmowy model Google
- Zobacz więcej: https://openrouter.ai/models
```

### Krok 10: Deployment Checklist

#### 10.1. Pre-deployment checklist

- [ ] Wszystkie testy przechodzą
- [ ] Zmienne środowiskowe skonfigurowane w production
- [ ] API keys są bezpiecznie przechowywane
- [ ] Timeout values są odpowiednie dla production
- [ ] Error logging jest skonfigurowane
- [ ] Rate limiting jest włączone
- [ ] Monitoring/alerting jest skonfigurowane
- [ ] Dokumentacja jest aktualna

#### 10.2. Environment variables w production

W DigitalOcean/Docker dodaj:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

#### 10.3. Monitoring

Rozważ dodanie:
- Logowanie wszystkich requestów i błędów
- Metryki: response times, token usage, error rates
- Alerty dla rate limits, errors, timeouts

## Podsumowanie

Ten plan wdrożenia obejmuje:

1. ✅ **Pełną implementację OpenRouterService** z TypeScript
2. ✅ **Type-safe structured outputs** poprzez `response_format`
3. ✅ **Solidną obsługę błędów** z hierarchią custom errors
4. ✅ **Retry logic z exponential backoff**
5. ✅ **Bezpieczeństwo** - API keys, HTTPS, input validation
6. ✅ **Przykłady użycia** - od prostych po zaawansowane
7. ✅ **Testy** - manualne i jednostkowe
8. ✅ **Dokumentację** dla zespołu
9. ✅ **Production readiness** - deployment checklist

Serwis jest zgodny z:
- ✅ Strukturą projektu (./src/lib/services/)
- ✅ Tech stackiem (TypeScript, Astro)
- ✅ Coding practices (early returns, error handling, type safety)
- ✅ OpenRouter API specification

Następne kroki to implementacja kodu zgodnie z tym planem, testowanie, i integracja z resztą aplikacji.

