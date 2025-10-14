# API Endpoint Implementation Plan: POST /api/ai-generation/sessions

## 1. Przegląd punktu końcowego

Endpoint `POST /api/ai-generation/sessions` umożliwia uwierzytelnionym użytkownikom rozpoczęcie sesji generowania fiszek przez AI. Proces obejmuje:
1. Przyjęcie tekstu źródłowego (1000-32768 znaków) od użytkownika
2. Utworzenie rekordu audytu w tabeli `ai_generation_audit`
3. Wygenerowanie mockowanych propozycji fiszek (20 sztuk)
4. Zwrócenie metadanych sesji oraz wygenerowanych propozycji

**Uwaga**: W obecnej wersji endpoint zwraca mockowane dane (20 fiszek) zamiast rzeczywistej integracji z OpenRouter API. Jest to pierwszy krok w przepływie generowania fiszek przez AI, gdzie użytkownik otrzymuje propozycje, które może następnie edytować i zapisać za pomocą endpointu batch save.

---

## 2. Szczegóły żądania

### Metoda HTTP
`POST`

### Struktura URL
```
/api/ai-generation/sessions
```

### Headers
- `Content-Type: application/json`
- `Authorization: Bearer <supabase-jwt-token>` (automatycznie obsługiwane przez Supabase middleware)

### Parametry

#### Wymagane
- `input_text` (string):
  - Długość: 1000-32768 znaków
  - Opis: Tekst źródłowy, na podstawie którego AI wygeneruje propozycje fiszek
  - Przykład: długi fragment tekstu edukacyjnego, artykuł, notatki z wykładu

#### Opcjonalne
- `model_identifier` (string | null):
  - Opis: Identyfikator modelu OpenRouter do użycia (np. "openai/gpt-4o-mini")
  - Domyślnie: null (backend użyje domyślnego modelu)
  - Przykład: `"openai/gpt-4o-mini"`, `"anthropic/claude-3-haiku"`

- `client_request_id` (uuid | null):
  - Opis: Unikalny identyfikator żądania generowany przez klienta dla zapewnienia idempotencji
  - Domyślnie: null (backend wygeneruje automatycznie)
  - Constraint: Musi być unikalny w kontekście danego użytkownika
  - Przykład: `"550e8400-e29b-41d4-a716-446655440000"`

### Request Body Schema (JSON)

```typescript
{
  input_text: string;              // 1000-32768 chars
  model_identifier?: string | null;
  client_request_id?: string | null; // UUID format
}
```

### Przykład Request Body

```json
{
  "input_text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit... [1000+ chars]",
  "model_identifier": "openai/gpt-4o-mini",
  "client_request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 3. Wykorzystywane typy

### Command Models (Request)

**`AiGenerationSessionCreateCommand`** (src/types.ts):
```typescript
interface AiGenerationSessionCreateCommand {
  input_text: string;
  model_identifier?: AiGenerationAuditEntity["model_identifier"];
  client_request_id?: AiGenerationAuditEntity["client_request_id"] | null;
}
```

### Response DTOs

**`AiGenerationSessionCreateResponseDTO`** (src/types.ts):
```typescript
interface AiGenerationSessionCreateResponseDTO {
  session: AiGenerationSessionDTO;
  proposals: AiGenerationProposalDTO[];
}
```

**`AiGenerationSessionDTO`** (src/types.ts):
```typescript
type AiGenerationSessionDTO = Pick<
  AiGenerationAuditEntity,
  "id" | "client_request_id" | "model_identifier" | "generation_started_at"
>;
```

**`AiGenerationProposalDTO`** (src/types.ts):
```typescript
interface AiGenerationProposalDTO {
  temporary_id: string;           // UUID generowany przez backend
  front_text: FlashcardEntity["front_text"]; // 1-500 chars
  back_text: FlashcardEntity["back_text"];   // 1-500 chars
}
```

### Error DTOs

**`ErrorResponseDTO`** (src/types.ts):
```typescript
interface ErrorResponseDTO {
  error: ErrorDTO;
}

interface ErrorDTO {
  code: string;
  message: string;
  details?: Record<string, string>;
}
```

### Zod Validation Schema

Utworzyć w `src/lib/schemas/ai-generation.schemas.ts`:

```typescript
import { z } from "zod";

export const AiGenerationSessionCreateSchema = z.object({
  input_text: z
    .string()
    .min(1000, "Input text must be at least 1000 characters")
    .max(32768, "Input text must not exceed 32768 characters")
    .trim(),
  model_identifier: z
    .string()
    .nullable()
    .optional(),
  client_request_id: z
    .string()
    .uuid("Invalid UUID format")
    .nullable()
    .optional(),
});

export type AiGenerationSessionCreateInput = z.infer<
  typeof AiGenerationSessionCreateSchema
>;
```

---

## 4. Szczegóły odpowiedzi

### Status Code: 201 Created

Pomyślne utworzenie sesji generowania i zwrócenie propozycji.

#### Response Body

```json
{
  "session": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "client_request_id": "550e8400-e29b-41d4-a716-446655440000",
    "model_identifier": "openai/gpt-4o-mini",
    "generation_started_at": "2025-10-14T10:30:45.123Z"
  },
  "proposals": [
    {
      "temporary_id": "temp-uuid-1",
      "front_text": "What is photosynthesis?",
      "back_text": "The process by which plants convert sunlight into energy."
    },
    {
      "temporary_id": "temp-uuid-2",
      "front_text": "What are the main products of photosynthesis?",
      "back_text": "Glucose (sugar) and oxygen."
    }
    // ... więcej propozycji
  ]
}
```

### Kody błędów

| Kod | Scenariusz | Error Code | Message |
|-----|------------|------------|---------|
| 400 | Nieprawidłowa długość tekstu | `INVALID_INPUT_LENGTH` | Input text must be between 1000 and 32768 characters |
| 400 | Nieprawidłowy format UUID | `INVALID_UUID_FORMAT` | client_request_id must be a valid UUID |
| 401 | Brak autentykacji | `UNAUTHORIZED` | Authentication required |
| 409 | Duplikat client_request_id | `DUPLICATE_REQUEST_ID` | A session with this client_request_id already exists |
| 422 | Błąd parsowania JSON | `INVALID_JSON` | Unable to parse request body |
| 429 | Rate limit exceeded | `RATE_LIMIT_EXCEEDED` | Too many requests. Please try again later. |
| 500 | Wewnętrzny błąd serwera | `INTERNAL_ERROR` | An unexpected error occurred |

#### Przykład Error Response (400)

```json
{
  "error": {
    "code": "INVALID_INPUT_LENGTH",
    "message": "Input text must be between 1000 and 32768 characters",
    "details": {
      "input_text": "Received 500 characters, expected 1000-32768"
    }
  }
}
```

---

## 5. Przepływ danych

### Diagram przepływu

```
Client
  │
  ├──► POST /api/ai-generation/sessions + JSON body
  │
  ▼
Astro API Endpoint (src/pages/api/ai-generation/sessions.ts)
  │
  ├──► 1. Walidacja Zod (input_text, model_identifier, client_request_id)
  │       └─► Błąd 400/422 jeśli nieprawidłowe
  │
  ├──► 2. Sprawdzenie autentykacji (context.locals.supabase.auth.getUser())
  │       └─► Błąd 401 jeśli nieautoryzowany
  │
  ├──► 3. Wywołanie AI Generation Service
  │       │
  │       ▼
  │    AI Generation Service (src/lib/services/ai-generation.service.ts)
  │       │
  │       ├──► 3a. Sprawdzenie rate limit (opcjonalne)
  │       │      └─► Błąd 429 jeśli przekroczony
  │       │
  │       ├──► 3b. Wygenerowanie client_request_id jeśli null
  │       │
  │       ├──► 3c. Utworzenie rekordu ai_generation_audit
  │       │      - user_id = auth.uid()
  │       │      - client_request_id
  │       │      - model_identifier (lub "mock")
  │       │      - generation_started_at = now()
  │       │      - generated_count = 20 (mockowane dane)
  │       │      - saved_unchanged_count = 0
  │       │      - saved_edited_count = 0
  │       │      - rejected_count = 0
  │       │      └─► Błąd 409 jeśli duplikat client_request_id
  │       │      └─► Błąd 500 jeśli błąd DB
  │       │
  │       ├──► 3d. Wygenerowanie mockowanych propozycji (20 fiszek)
  │       │      - Utworzenie tablicy z 20 obiektami AiGenerationProposalDTO
  │       │      - Każdy z unique temporary_id (UUID)
  │       │      - Każdy z przykładowym front_text i back_text
  │       │
  │       └──► Zwrot: { session, proposals }
  │
  └──► 4. Zwrot Response 201 + JSON
```

### Szczegółowe kroki

1. **Przyjęcie żądania**: Endpoint Astro przyjmuje POST request i parsuje JSON body
2. **Walidacja danych**: Zod schema waliduje format i długość pól
3. **Autentykacja**: Middleware Supabase weryfikuje JWT token
4. **Sprawdzenie rate limit**: Opcjonalna ochrona przed nadużyciami
5. **Utworzenie rekordu audytu**: Wstawienie do `ai_generation_audit` z `generated_count=20`
6. **Generowanie mockowanych propozycji**: Utworzenie tablicy 20 propozycji fiszek z przykładowymi danymi
7. **Zwrot odpowiedzi**: Response 201 z session i proposals

### Interakcje z bazą danych

**Tabela: `ai_generation_audit`**

**INSERT** (krok 3c):
```sql
INSERT INTO ai_generation_audit (
  user_id,
  client_request_id,
  model_identifier,
  generation_started_at,
  generated_count,
  saved_unchanged_count,
  saved_edited_count,
  rejected_count
)
VALUES (
  $1, -- auth.uid()
  $2, -- client_request_id (wygenerowany lub z requestu)
  $3, -- model_identifier (lub "mock")
  NOW(),
  20, -- mockowane dane: zawsze 20 fiszek
  0,
  0,
  0
)
RETURNING id, client_request_id, model_identifier, generation_started_at;
```

**Row Level Security (RLS)**:
- INSERT policy: `WITH CHECK (user_id = auth.uid())`
- Zapewnia, że tylko właściciel może utworzyć sesję

### Generowanie mockowanych propozycji

**Funkcja mockowania** (w AI Generation Service):

```typescript
function generateMockProposals(count: number = 20): AiGenerationProposalDTO[] {
  return Array.from({ length: count }, (_, i) => ({
    temporary_id: crypto.randomUUID(),
    front_text: `Mock question ${i + 1}`,
    back_text: `Mock answer ${i + 1}`
  }));
}
```

**Przykładowe mockowane dane**:
```json
[
  {
    "temporary_id": "550e8400-e29b-41d4-a716-446655440000",
    "front_text": "Mock question 1",
    "back_text": "Mock answer 1"
  },
  {
    "temporary_id": "550e8400-e29b-41d4-a716-446655440001",
    "front_text": "Mock question 2",
    "back_text": "Mock answer 2"
  }
  // ... pozostałe 18 fiszek
]
```

---

## 6. Względy bezpieczeństwa

### 1. Uwierzytelnianie (Authentication)

**Wymaganie**: Wszystkie żądania muszą zawierać ważny JWT token Supabase.

**Implementacja**:
```typescript
const { data: { user }, error } = await context.locals.supabase.auth.getUser();

if (error || !user) {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

### 2. Autoryzacja (Authorization)

**Wymaganie**: Użytkownik może tworzyć sesje tylko dla siebie.

**Implementacja**:
- RLS w PostgreSQL automatycznie filtruje na podstawie `auth.uid()`
- INSERT do `ai_generation_audit` z `user_id = auth.uid()`
- Policy: `WITH CHECK (user_id = auth.uid())`

### 3. Walidacja danych wejściowych

**Zagrożenia**:
- XSS: Złośliwy kod w `input_text`
- SQL Injection: Parametryzowane zapytania (Supabase SDK chroni)

**Ochrona**:
```typescript
// Zod sanitization
const schema = z.object({
  input_text: z.string().min(1000).max(32768).trim(),
  // ...
});

// W przyszłości przed wysłaniem do AI - sanityzacja HTML
// import { sanitize } from "some-html-sanitizer";
// const sanitizedText = sanitize(validatedData.input_text);
```

### 5. Secrets Management

**Uwaga**: W obecnej wersji mockowej nie są wymagane żadne klucze API.

**W przyszłości (integracja z OpenRouter)**:
- API Key będzie przechowywany w zmiennej środowiskowej: `OPENROUTER_API_KEY`
- Nigdy nie commitować do repozytorium
- Używać `.env.local` lokalnie
- Ustawić w production environment (np. DigitalOcean)

### 6. CORS i Headers

**Zabezpieczenia nagłówków**:
```typescript
// W odpowiedzi
headers: {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block"
}
```

### 7. Walidacja model_identifier

**Zagrożenie**: Użytkownik może próbować użyć nieistniejącego lub nieprawidłowego modelu.

**Ochrona**:
```typescript
const ALLOWED_MODELS = [
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "anthropic/claude-3-haiku",
  "anthropic/claude-3-sonnet",
];

const DEFAULT_MODEL = "openai/gpt-4o-mini";

function validateModel(identifier: string | null | undefined): string {
  if (!identifier) return DEFAULT_MODEL;
  if (ALLOWED_MODELS.includes(identifier)) return identifier;
  return DEFAULT_MODEL; // fallback
}
```

### 8. Timeout Protection

**Uwaga**: W obecnej wersji mockowej timeout nie jest potrzebny, ponieważ generowanie danych jest synchroniczne i szybkie.

**W przyszłości (integracja z OpenRouter)**:
- Implementacja timeout dla wywołań API (np. 60s)
- AbortController dla fetch requests
- Graceful error handling przy timeout

### 9. Unikalność client_request_id

**Cel**: Idempotencja żądań - zapobieganie duplikatom przy retry.

**Implementacja**:
- Constraint w DB: `UNIQUE (user_id, client_request_id)`
- Przed INSERT: sprawdzenie czy istnieje
- Jeśli istnieje: zwrot 409 Conflict

```typescript
// Sprawdzenie przed INSERT
const { data: existing } = await supabase
  .from("ai_generation_audit")
  .select("id")
  .eq("user_id", userId)
  .eq("client_request_id", clientRequestId)
  .single();

if (existing) {
  return { error: "DUPLICATE_REQUEST_ID", status: 409 };
}
```

---

## 7. Obsługa błędów

### Strategia obsługi błędów

1. **Walidacja na poziomie Zod** → 400 Bad Request
2. **Autentykacja** → 401 Unauthorized
3. **Duplikaty / konflikty DB** → 409 Conflict
4. **Błędy parsowania JSON** → 422 Unprocessable Entity
5. **Rate limiting** → 429 Too Many Requests
6. **Nieoczekiwane błędy** → 500 Internal Server Error

### Szczegółowa obsługa błędów

#### 1. Błędy walidacji (400 Bad Request)

**Scenariusze**:
- `input_text` < 1000 lub > 32768 znaków
- `client_request_id` nie jest poprawnym UUID

**Implementacja**:
```typescript
try {
  const validated = AiGenerationSessionCreateSchema.parse(requestBody);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INVALID_INPUT",
          message: "Validation failed",
          details: error.flatten().fieldErrors
        }
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

#### 2. Brak autentykacji (401 Unauthorized)

**Scenariusz**: Brak lub nieprawidłowy JWT token.

**Implementacja**:
```typescript
const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();

if (authError || !user) {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 3. Duplikat client_request_id (409 Conflict)

**Scenariusz**: Użytkownik próbuje utworzyć sesję z już istniejącym `client_request_id`.

**Implementacja**:
```typescript
const { error: insertError } = await supabase
  .from("ai_generation_audit")
  .insert(auditData);

if (insertError) {
  if (insertError.code === "23505") { // Postgres unique violation
    return new Response(
      JSON.stringify({
        error: {
          code: "DUPLICATE_REQUEST_ID",
          message: "A session with this client_request_id already exists",
          details: {
            client_request_id: auditData.client_request_id
          }
        }
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

#### 4. Błąd parsowania JSON (422 Unprocessable Entity)

**Scenariusz**: Request body nie jest poprawnym JSON lub odpowiedź AI nie ma oczekiwanego formatu.

**Implementacja**:
```typescript
let requestBody;
try {
  requestBody = await request.json();
} catch (error) {
  return new Response(
    JSON.stringify({
      error: {
        code: "INVALID_JSON",
        message: "Unable to parse request body"
      }
    }),
    { status: 422, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 5. Rate limit exceeded (429 Too Many Requests)

**Scenariusz**: Użytkownik przekroczył limit żądań.

**Implementacja**:
```typescript
const isAllowed = await checkRateLimit(user.id);

if (!isAllowed) {
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        details: {
          retry_after: "60"
        }
      }
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60"
      }
    }
  );
}
```

#### 6. Wewnętrzny błąd serwera (500)

**Scenariusz**: Nieoczekiwane błędy (błędy DB, błędy kodu).

**Implementacja**:
```typescript
try {
  // ... główna logika
} catch (error) {
  console.error("Unexpected error in AI generation session:", error);
  
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
      }
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Logging błędów

```typescript
function logError(context: string, error: unknown, userId?: string) {
  console.error(`[${context}]`, {
    timestamp: new Date().toISOString(),
    userId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
}

// Użycie
logError("AI_GENERATION_SESSION", error, user.id);
```

---

## 8. Rozważania dotyczące wydajności

### 1. Wąskie gardła

**Identyfikowane problemy**:

1. **Database INSERT** (główne opóźnienie):
   - Minimalne opóźnienie (< 50ms)
   - Mitigacja: Indeksy na `user_id`, `client_request_id`

2. **Generowanie mockowanych danych**:
   - Bardzo szybkie (< 1ms)
   - 20 obiektów w pamięci
   - Brak optymalizacji potrzebnej

3. **JSON Serialization**:
   - Serializacja odpowiedzi z 20 fiszkami (< 10ms)
   - Mitigacja: Natywny `JSON.stringify()`

4. **Network Bandwidth**:
   - Wysyłanie do 32768 znaków input_text w request
   - Zwracanie ~20 fiszek w response (niewielki rozmiar)
   - Mitigacja: Kompresja (gzip), HTTP/2

**Uwaga**: W obecnej mockowej implementacji wydajność jest bardzo wysoka (< 100ms całkowity czas odpowiedzi). Główne wąskie gardło będzie w przyszłości przy integracji z rzeczywistym AI API.

### 2. Strategie optymalizacji

#### A. Database connection pooling

**Problem**: Zbyt wiele połączeń do PostgreSQL przy dużym ruchu.

**Rozwiązanie**:
- Supabase SDK już używa connection pooling
- Ustawić odpowiednie limity w konfiguracji Supabase
- Monitorować liczbę aktywnych połączeń


## 9. Etapy wdrożenia

### Krok 1: Przygotowanie typów i schematów walidacji

**Cel**: Zdefiniować wszystkie typy TypeScript i schematy Zod potrzebne do implementacji.

**Zadania**:
1. Upewnić się, że `src/types.ts` zawiera wszystkie niezbędne typy (już zrobione)
2. Utworzyć plik `src/lib/schemas/ai-generation.schemas.ts`
3. Zdefiniować schemat Zod dla request body:
   ```typescript
   export const AiGenerationSessionCreateSchema = z.object({
     input_text: z.string().min(1000).max(32768).trim(),
     model_identifier: z.string().nullable().optional(),
     client_request_id: z.string().uuid().nullable().optional(),
   });
   ```
4. Zdefiniować schemat Zod dla odpowiedzi OpenRouter (do parsowania)

**Pliki do utworzenia/zmodyfikowania**:
- `src/lib/schemas/ai-generation.schemas.ts` (nowy)

**Testy**:
- Zwalidować przykładowe dane poprawnymi i błędnymi wartościami

---

### Krok 2: Implementacja Mock Flashcard Generator (opcjonalne)

**Cel**: Utworzyć funkcję pomocniczą do generowania mockowanych propozycji fiszek.

**Uwaga**: Ta funkcja może być bezpośrednio w AI Generation Service, nie wymaga osobnego pliku.

**Zadania**:
1. Zaimplementować funkcję `generateMockProposals()`:
   - Przyjmuje: `count` (domyślnie 20)
   - Zwraca: `AiGenerationProposalDTO[]`
2. Implementacja:
   - Użyć `Array.from()` do utworzenia tablicy
   - Każda propozycja z unikalnym `temporary_id` (crypto.randomUUID())
   - Przykładowe teksty: `"Mock question X"` i `"Mock answer X"`

**Przykładowa implementacja**:
```typescript
function generateMockProposals(count: number = 20): AiGenerationProposalDTO[] {
  return Array.from({ length: count }, (_, i) => ({
    temporary_id: crypto.randomUUID(),
    front_text: `What is the answer to question ${i + 1}?`,
    back_text: `This is the answer to question ${i + 1}.`
  }));
}
```

**Pliki do utworzenia/zmodyfikowania**:
- Może być w `src/lib/services/ai-generation.service.ts` (jako helper function)

**Testy**:
- Sprawdzić czy zwraca 20 propozycji
- Sprawdzić czy każdy `temporary_id` jest unikalny

---

### Krok 3: Implementacja AI Generation Service

**Cel**: Utworzyć serwis zarządzający logiką biznesową sesji generowania (z mockowanymi danymi).

**Zadania**:
1. Utworzyć plik `src/lib/services/ai-generation.service.ts`
2. Zaimplementować funkcję pomocniczą `generateMockProposals()` (z kroku 2)
3. Zaimplementować funkcję `createAiGenerationSession()`:
   - Przyjmuje: `SupabaseClient`, `userId`, `AiGenerationSessionCreateCommand`
   - Zwraca: `Promise<AiGenerationSessionCreateResponseDTO>`
4. Logika funkcji:
   - Wygenerować `client_request_id` jeśli null (crypto.randomUUID())
   - Sprawdzić unikalność `client_request_id` dla użytkownika (optional pre-check)
   - Wygenerować mockowane propozycje (20 fiszek)
   - INSERT do `ai_generation_audit`:
     - `user_id`, `client_request_id`, `model_identifier` (lub "mock")
     - `generation_started_at = NOW()`
     - `generated_count = 20`
     - `saved_unchanged_count = 0`, `saved_edited_count = 0`, `rejected_count = 0`
   - Obsłużyć błąd 409 przy duplikacie (unique constraint violation)
   - Zwrócić `{ session, proposals }`
5. Error handling:
   - Database errors → throw with error code
   - Wrap wszystko w try-catch

**Przykładowa sygnatura**:
```typescript
export async function createAiGenerationSession(
  supabase: SupabaseClient,
  userId: string,
  command: AiGenerationSessionCreateCommand
): Promise<AiGenerationSessionCreateResponseDTO> {
  // implementacja
}
```

**Pliki do utworzenia**:
- `src/lib/services/ai-generation.service.ts` (nowy)

**Testy**:
- Mockować Supabase client
- Przetestować happy path i error paths (409, 500)

---

### Krok 5: Implementacja API Endpoint

**Cel**: Utworzyć endpoint Astro `POST /api/ai-generation/sessions`.

**Zadania**:
1. Utworzyć plik `src/pages/api/ai-generation/sessions.ts`
2. Dodać `export const prerender = false;`
3. Zaimplementować handler `POST`:
   ```typescript
   export async function POST(context: APIContext): Promise<Response>
   ```
4. Logika handlera:
   - Parsowanie JSON body (try-catch → 422)
   - Walidacja Zod schema (catch → 400)
   - Sprawdzenie autentykacji (getUser → 401)
   - Sprawdzenie rate limit (optional → 429)
   - Wywołanie `createAiGenerationSession()`
   - Error handling dla różnych kodów błędów
   - Zwrócenie Response 201 z danymi
5. Implementacja error responses zgodnie z `ErrorResponseDTO`
6. Ustawienie odpowiednich headers:
   ```typescript
   headers: {
     "Content-Type": "application/json",
     "X-Content-Type-Options": "nosniff"
   }
   ```

**Struktura pliku**:
```typescript
import type { APIContext } from "astro";
import { AiGenerationSessionCreateSchema } from "../../lib/schemas/ai-generation.schemas";
import { createAiGenerationSession } from "../../lib/services/ai-generation.service";
import { checkRateLimit } from "../../lib/services/rate-limit.service";

export const prerender = false;

export async function POST(context: APIContext): Promise<Response> {
  // 1. Parse JSON
  // 2. Validate Zod
  // 3. Auth check
  // 4. Rate limit
  // 5. Call service
  // 6. Error handling
  // 7. Return response
}
```

**Pliki do utworzenia**:
- `src/pages/api/ai-generation/sessions.ts` (nowy)

**Testy**:
- Testować różne scenariusze błędów
- Testować happy path

---

### Krok 7: Error Handling Helpers (opcjonalne)

**Cel**: Utworzyć helpery do spójnej obsługi błędów.

**Zadania**:
1. Utworzyć plik `src/lib/utils/error-response.ts`
2. Zaimplementować funkcję `createErrorResponse()`:
   ```typescript
   export function createErrorResponse(
     code: string,
     message: string,
     status: number,
     details?: Record<string, string>
   ): Response {
     return new Response(
       JSON.stringify({
         error: { code, message, details }
       }),
       {
         status,
         headers: { "Content-Type": "application/json" }
       }
     );
   }
   ```
3. Opcjonalnie: zdefiniować stałe dla kodów błędów:
   ```typescript
   export const ERROR_CODES = {
     INVALID_INPUT_LENGTH: "INVALID_INPUT_LENGTH",
     UNAUTHORIZED: "UNAUTHORIZED",
     // ...
   } as const;
   ```

**Pliki do utworzenia**:
- `src/lib/utils/error-response.ts` (nowy)

---

## Podsumowanie

Ten plan wdrożenia zawiera szczegółowe kroki niezbędne do implementacji endpointu `POST /api/ai-generation/sessions` **z mockowanymi danymi**. Kluczowe aspekty:

1. **Bezpieczeństwo**: Autentykacja, autoryzacja, rate limiting, walidacja danych
2. **Obsługa błędów**: Kompletna obsługa wszystkich scenariuszy błędów z odpowiednimi kodami HTTP (400, 401, 409, 422, 429, 500)
3. **Wydajność**: Bardzo wysoka (< 100ms) dzięki mockowanym danym, optymalizacja zapytań DB
4. **Maintainability**: Separacja logiki na serwisy, czytelny kod, dokumentacja
5. **Testowanie**: Testy jednostkowe, integracyjne, E2E

**Obecna implementacja (MVP)**:
- Zwraca 20 mockowanych propozycji fiszek
- Nie wymaga integracji z OpenRouter API
- Brak kosztów AI w fazie testowej
- Pozwala na rozwój i testowanie frontendu oraz batch save flow

**Przyszłe rozszerzenia**:
- Integracja z OpenRouter API dla prawdziwego generowania fiszek przez AI
- Optymalizacja promptów i wybór najlepszego modelu
- Async processing dla długich operacji
- Streaming responses

Implementacja powinna zostać wykonana stopniowo, krok po kroku, z testowaniem każdego komponentu osobno przed integracją. Dzięki temu łatwiej będzie zidentyfikować i naprawić błędy na wczesnym etapie.

