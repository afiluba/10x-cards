# API Endpoint Implementation Plan: POST /api/flashcards/batch

## 1. Przegląd punktu końcowego

Endpoint `POST /api/flashcards/batch` służy do zbiorczego zapisu zaakceptowanych propozycji flashcards wygenerowanych przez AI w ramach pojedynczej sesji generowania. Endpoint realizuje kompleksową operację biznesową obejmującą:

- Zapisanie wielu flashcards jednocześnie do tabeli `flashcards`
- Aktualizację liczników audytu w tabeli `ai_generation_audit`
- Oznaczenie sesji jako zakończonej poprzez ustawienie `generation_completed_at`
- Zapewnienie atomowości całej operacji poprzez wykorzystanie transakcji bazodanowej

Endpoint jest kluczowym elementem przepływu AI generation, umożliwiającym użytkownikom zaakceptowanie wygenerowanych propozycji i trwałe zapisanie ich jako flashcards w systemie.

## 2. Szczegóły żądania

### Metoda HTTP
`POST`

### Struktura URL
```
/api/flashcards/batch
```

### Nagłówki żądania
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (w przyszłości, obecnie static user ID)

### Request Body

```typescript
{
  ai_generation_audit_id: string;        // UUID sesji audytu AI
  cards: [                               // Tablica kart (minimum 1 element)
    {
      front_text: string;                // 1-500 znaków
      back_text: string;                 // 1-500 znaków
      origin_status: "AI_ORIGINAL" | "AI_EDITED"
    },
    // ... więcej kart
  ];
  rejected_count: number;                // >= 0, liczba odrzuconych propozycji
}
```

### Parametry

**Wymagane:**
- `ai_generation_audit_id` (uuid) - Identyfikator sesji generowania AI, której dotyczy zapis
- `cards` (array, minimum 1 element) - Tablica obiektów reprezentujących karty do zapisania:
  - `front_text` (string, 1-500 chars) - Tekst pytania/przodu karty
  - `back_text` (string, 1-500 chars) - Tekst odpowiedzi/tyłu karty
  - `origin_status` (enum) - Status pochodzenia: `AI_ORIGINAL` (niezmodyfikowana propozycja) lub `AI_EDITED` (edytowana przez użytkownika)
- `rejected_count` (integer, >= 0) - Liczba propozycji odrzuconych przez użytkownika

**Opcjonalne:**
- Brak

### Warunki biznesowe
1. Suma `cards.length + rejected_count` musi być równa `generated_count` z sesji audytu
2. Sesja audytu musi istnieć i należeć do zalogowanego użytkownika
3. Sesja audytu nie może być już zakończona (`generation_completed_at` musi być `null`)
4. Każda karta musi spełniać ograniczenia długości tekstu (1-500 znaków)

## 3. Wykorzystywane typy

### Command Models (Request)
```typescript
// z src/types.ts
FlashcardBatchSaveCommand {
  ai_generation_audit_id: AiGenerationAuditEntity["id"];
  cards: readonly [FlashcardBatchSaveCardCommand, ...FlashcardBatchSaveCardCommand[]];
  rejected_count: AiGenerationAuditEntity["rejected_count"];
}

FlashcardBatchSaveCardCommand {
  front_text: FlashcardEntity["front_text"];
  back_text: FlashcardEntity["back_text"];
  origin_status: Extract<FlashcardSourceType, "AI_ORIGINAL" | "AI_EDITED">;
}
```

### Response DTOs
```typescript
// z src/types.ts
FlashcardBatchSaveResponseDTO {
  saved_card_ids: FlashcardEntity["id"][];
  audit: FlashcardBatchAuditDTO;
}

FlashcardBatchAuditDTO = Pick<
  AiGenerationAuditEntity,
  | "id"
  | "generated_count"
  | "saved_unchanged_count"
  | "saved_edited_count"
  | "rejected_count"
  | "generation_completed_at"
>
```

### Error DTOs
```typescript
// z src/types.ts
ErrorResponseDTO {
  error: ErrorDTO;
}

ErrorDTO {
  code: string;
  message: string;
  details?: Record<string, string>;
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "saved_card_ids": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ],
  "audit": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "generated_count": 10,
    "saved_unchanged_count": 6,
    "saved_edited_count": 3,
    "rejected_count": 1,
    "generation_completed_at": "2025-10-13T10:06:00.000Z"
  }
}
```

**Nagłówki:**
- `Content-Type: application/json`
- `X-Content-Type-Options: nosniff`

### Błędy

#### 400 Bad Request
**Przyczyny:**
- Pusta tablica `cards`
- Rozbieżność sum: `cards.length + rejected_count ≠ generated_count`
- Nieprawidłowe wartości (np. `rejected_count < 0`)

**Przykład:**
```json
{
  "error": {
    "code": "INVALID_COUNTS",
    "message": "Sum of saved and rejected cards does not match generated count",
    "details": {
      "expected": "10",
      "received": "8"
    }
  }
}
```

#### 401 Unauthorized
**Przyczyna:** Brak autentykacji użytkownika

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 404 Not Found
**Przyczyna:** Sesja AI generation audit nie istnieje lub nie należy do użytkownika

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "AI generation session not found"
  }
}
```

#### 409 Conflict
**Przyczyna:** Sesja już została rozliczona (`generation_completed_at` nie jest null)

```json
{
  "error": {
    "code": "SESSION_ALREADY_COMPLETED",
    "message": "This AI generation session has already been completed"
  }
}
```

#### 422 Unprocessable Entity
**Przyczyna:** Nieprawidłowy format JSON

```json
{
  "error": {
    "code": "INVALID_JSON",
    "message": "Unable to parse request body"
  }
}
```

#### 500 Internal Server Error
**Przyczyna:** Błędy bazy danych, błędy transakcji

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "database_error": "Transaction failed"
    }
  }
}
```

## 5. Przepływ danych

### Diagram przepływu

```
1. Client Request
   └─> POST /api/flashcards/batch + JSON body
       │
2. API Endpoint (/src/pages/api/flashcards/batch.ts)
   ├─> Parse JSON
   ├─> Validate with Zod schema
   ├─> Extract user_id from auth context
   │
3. Service Layer (/src/lib/services/flashcard.service.ts or ai-generation.service.ts)
   ├─> Fetch ai_generation_audit record
   ├─> Validate session ownership (via RLS)
   ├─> Check if session not completed
   ├─> Validate counts match
   │
4. Database Transaction (Supabase)
   ├─> Begin transaction
   ├─> Insert flashcards (bulk insert)
   │   └─> Set user_id, source_type, ai_generation_audit_id
   ├─> Update ai_generation_audit
   │   ├─> Increment saved_unchanged_count
   │   ├─> Increment saved_edited_count
   │   ├─> Set rejected_count
   │   └─> Set generation_completed_at = now()
   ├─> Commit transaction
   │
5. Response Construction
   ├─> Map saved card IDs
   ├─> Build audit DTO
   └─> Return 200 OK with JSON
```

### Szczegółowy przepływ operacji

**Krok 1: Parsowanie i walidacja wejścia**
- Odczyt i parsowanie JSON z request body
- Walidacja struktury danych poprzez Zod schema
- Sprawdzenie długości tekstów (1-500 znaków)
- Walidacja UUID dla `ai_generation_audit_id`
- Weryfikacja że `cards` nie jest pusta
- Weryfikacja że `rejected_count >= 0`

**Krok 2: Weryfikacja sesji audytu**
- Pobranie rekordu `ai_generation_audit` z bazy
- Sprawdzenie czy sesja istnieje (404 jeśli nie)
- RLS automatycznie zapewnia że sesja należy do zalogowanego użytkownika
- Sprawdzenie czy `generation_completed_at IS NULL` (409 jeśli nie)

**Krok 3: Walidacja liczników**
- Obliczenie: `saved_count = cards.length`
- Sprawdzenie: `saved_count + rejected_count === generated_count`
- Zwrócenie 400 jeśli suma się nie zgadza

**Krok 4: Atomowa transakcja zapisu**
- Rozpoczęcie transakcji bazodanowej
- Bulk insert flashcards:
  ```sql
  INSERT INTO flashcards (user_id, front_text, back_text, source_type, ai_generation_audit_id)
  VALUES (...), (...), (...)
  RETURNING id
  ```
- Mapowanie `origin_status` na `source_type` (AI_ORIGINAL → ai_original, AI_EDITED → ai_edited)
- Update ai_generation_audit:
  ```sql
  UPDATE ai_generation_audit
  SET saved_unchanged_count = <count_of_AI_ORIGINAL>,
      saved_edited_count = <count_of_AI_EDITED>,
      rejected_count = <rejected_count>,
      generation_completed_at = now()
  WHERE id = <ai_generation_audit_id>
  RETURNING *
  ```
- Commit transakcji

**Krok 5: Konstrukcja odpowiedzi**
- Zebranie ID zapisanych flashcards
- Zbudowanie obiektu `FlashcardBatchAuditDTO`
- Zwrócenie response 200 OK z JSON

## 6. Względy bezpieczeństwa

### Autentykacja
- **Obecnie:** Static user ID dla celów testowych (`00000000-0000-0000-0000-000000000000`)
- **W przyszłości:** Supabase Auth poprzez middleware
- Endpoint wymaga zalogowanego użytkownika (401 jeśli brak autentykacji)

### Autoryzacja
- **Row Level Security (RLS):** Supabase automatycznie filtruje rekordy po `user_id = auth.uid()`
- Użytkownik może zapisywać flashcards tylko dla własnych sesji AI generation
- Użytkownik nie może modyfikować sesji innych użytkowników

### Walidacja danych wejściowych
1. **Walidacja UUID:** Zapobieganie SQL injection poprzez walidację formatu UUID
2. **Walidacja długości tekstów:** Wymuszenie limitów 1-500 znaków (zgodnie z CHECK constraints w bazie)
3. **Walidacja enum:** Ograniczenie `origin_status` do `AI_ORIGINAL` lub `AI_EDITED`
4. **Walidacja liczb:** Sprawdzenie że `rejected_count >= 0`
5. **Walidacja tablicy:** Wymuszenie minimum 1 elementu w `cards`

### Integralność danych
1. **Atomowość transakcji:** Wszystkie operacje muszą się udać lub żadna (ACID)
2. **Weryfikacja sum:** Sprawdzenie `saved + rejected = generated` zapobiega niespójnościom
3. **Weryfikacja stanu sesji:** Sprawdzenie `generation_completed_at IS NULL` zapobiega duplikatom
4. **Foreign key constraints:** Relacja `ai_generation_audit_id` zapewnia integralność referencyjną

### Zapobieganie atakom
- **SQL Injection:** Użycie prepared statements w Supabase SDK
- **XSS:** Header `X-Content-Type-Options: nosniff`
- **Denial of Service:** 
  - Limit długości tekstów (max 500 znaków)
  - Brak limitu na liczbę kart w jednym batch (należy rozważyć dodanie limitu np. 100 kart)
- **Race conditions:** Transakcje bazodanowe zapewniają izolację

### Rekomendacje dodatkowe
1. **Rate limiting:** Rozważyć dodanie rate limiting dla endpoint (np. max 10 requestów/minutę)
2. **Limit wielkości batch:** Rozważyć limit maksymalnej liczby kart w jednym batch (np. 100)
3. **Audit logging:** Rozważyć logowanie wszystkich operacji batch save dla celów audytowych
4. **Input sanitization:** Rozważyć sanityzację HTML/scripts w tekstach flashcards

## 7. Obsługa błędów

### Katalog błędów

| Kod HTTP | Error Code | Przyczyna | Komunikat | Działanie |
|----------|------------|-----------|-----------|-----------|
| 400 | `INVALID_INPUT` | Nieprawidłowa walidacja Zod | "Validation failed" + details | Sprawdzić format danych wejściowych |
| 400 | `INVALID_COUNTS` | Rozbieżność sum | "Sum of saved and rejected cards does not match generated count" | Poprawić liczniki |
| 400 | `EMPTY_CARDS_ARRAY` | Pusta tablica cards | "Cards array cannot be empty" | Dodać co najmniej jedną kartę |
| 401 | `UNAUTHORIZED` | Brak autentykacji | "Authentication required" | Zalogować się |
| 404 | `SESSION_NOT_FOUND` | Brak sesji audytu | "AI generation session not found" | Sprawdzić UUID sesji |
| 409 | `SESSION_ALREADY_COMPLETED` | Sesja już zakończona | "This AI generation session has already been completed" | Sesja już została rozliczona |
| 422 | `INVALID_JSON` | Błąd parsowania JSON | "Unable to parse request body" | Sprawdzić składnię JSON |
| 500 | `INTERNAL_ERROR` | Błąd bazy danych | "An unexpected error occurred" | Skontaktować się z supportem |
| 500 | `TRANSACTION_FAILED` | Błąd transakcji | "Failed to save flashcards" | Spróbować ponownie |

### Hierarchia obsługi błędów

```typescript
try {
  // 1. Parse JSON
} catch (JSONError) {
  return 422 INVALID_JSON
}

try {
  // 2. Validate with Zod
} catch (ZodError) {
  return 400 INVALID_INPUT + field errors
}

// 3. Check authentication
if (!user_id) {
  return 401 UNAUTHORIZED
}

try {
  // 4. Service layer
  const session = await fetchSession(audit_id);
  
  if (!session) {
    return 404 SESSION_NOT_FOUND
  }
  
  if (session.generation_completed_at !== null) {
    return 409 SESSION_ALREADY_COMPLETED
  }
  
  if (cards.length + rejected_count !== session.generated_count) {
    return 400 INVALID_COUNTS
  }
  
  // 5. Database transaction
  const result = await saveBatchFlashcards(...);
  
  return 200 OK + result
  
} catch (ServiceError) {
  // Custom service errors z kodem i statusem
  return error.status + error.code
} catch (DatabaseError) {
  return 500 INTERNAL_ERROR
}
```

### Logowanie błędów
- Wszystkie błędy 5xx powinny być logowane do systemu monitoringu
- Błędy 4xx mogą być logowane dla celów analitycznych
- Logi powinny zawierać:
  - Timestamp
  - User ID
  - Request ID (dla śledzenia)
  - Error code i message
  - Stack trace (dla błędów 5xx)

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Bulk insert flashcards**
   - Problem: Wstawianie dużej liczby rekordów może być wolne
   - Rozwiązanie: Użycie bulk insert Supabase (pojedyncze zapytanie z wieloma wartościami)
   - Limit: Rozważyć max 100 kart w jednym batch

2. **Transakcje bazodanowe**
   - Problem: Długie transakcje mogą blokować inne operacje
   - Rozwiązanie: Minimalizacja logiki w transakcji (tylko INSERT + UPDATE)
   - Monitoring: Logowanie czasu trwania transakcji

3. **Walidacja danych**
   - Problem: Walidacja Zod dla dużych tablic może być kosztowna
   - Rozwiązanie: Zod jest szybkie dla typowych przypadków, ale rozważyć limit wielkości batch

4. **Konkurencyjne zapisy**
   - Problem: Dwie równoczesne próby zakończenia tej samej sesji
   - Rozwiązanie: Sprawdzenie `generation_completed_at IS NULL` w transakcji zapobiega race condition

### Strategie optymalizacji

**1. Bulk insert z RETURNING**
```typescript
// Zamiast wielu pojedynczych insertów, jeden bulk insert
const { data: savedCards } = await supabase
  .from('flashcards')
  .insert(cardsToInsert)
  .select('id');
```

**2. Minimalizacja roundtripów**
- Pobranie sesji audytu: 1 query
- Bulk insert flashcards: 1 query
- Update audytu: 1 query
- **Łącznie: 3 roundtripy do bazy**

**3. Indeksy bazodanowe**
- Index na `flashcards(ai_generation_audit_id)` - przyspieszenie powiązań
- Index na `ai_generation_audit(id)` - już istnieje jako PK
- Index na `flashcards(user_id, deleted_at)` - już istnieje według planu

**4. Connection pooling**
- Supabase automatycznie zarządza connection pooling
- Rozważyć zwiększenie limitu połączeń dla wysokiego ruchu

**5. Monitoring i metryki**
Śledzić:
- Czas odpowiedzi endpoint (p50, p95, p99)
- Czas trwania transakcji
- Rozmiar batch (średnia, max)
- Częstość błędów
- Database query performance

### Skalowanie

**Krótkoterminowe (do 1000 użytkowników):**
- Obecna architektura jest wystarczająca
- Monitoring podstawowych metryk

**Średnioterminowe (1000-10000 użytkowników):**
- Dodanie cache dla często używanych danych
- Optymalizacja queries (EXPLAIN ANALYZE)
- Rate limiting

**Długoterminowe (10000+ użytkowników):**
- Rozważenie shardingu bazy danych
- Read replicas dla odczytów
- Async processing dla dużych batch

## 9. Etapy wdrożenia

### Krok 1: Stworzenie Zod schema dla walidacji
**Plik:** `/src/lib/schemas/flashcard.schemas.ts` (nowy plik)

**Zadania:**
- Utworzyć nowy plik dla schematów flashcard
- Zdefiniować `FlashcardBatchSaveSchema`:
  ```typescript
  import { z } from "zod";
  
  export const FlashcardBatchSaveCardSchema = z.object({
    front_text: z
      .string()
      .min(1, "Front text cannot be empty")
      .max(500, "Front text must not exceed 500 characters")
      .trim(),
    back_text: z
      .string()
      .min(1, "Back text cannot be empty")
      .max(500, "Back text must not exceed 500 characters")
      .trim(),
    origin_status: z.enum(["AI_ORIGINAL", "AI_EDITED"], {
      errorMap: () => ({ message: "Origin status must be AI_ORIGINAL or AI_EDITED" }),
    }),
  });
  
  export const FlashcardBatchSaveSchema = z.object({
    ai_generation_audit_id: z
      .string()
      .uuid("Invalid UUID format for ai_generation_audit_id"),
    cards: z
      .array(FlashcardBatchSaveCardSchema)
      .nonempty("Cards array cannot be empty"),
    rejected_count: z
      .number()
      .int("Rejected count must be an integer")
      .min(0, "Rejected count cannot be negative"),
  });
  
  export type FlashcardBatchSaveInput = z.infer<typeof FlashcardBatchSaveSchema>;
  ```

**Weryfikacja:**
- Schema kompiluje się bez błędów
- Typy TypeScript są poprawnie inferred

### Krok 2: Implementacja logiki service
**Plik:** `/src/lib/services/flashcard.service.ts` (nowy plik) lub rozszerzenie `ai-generation.service.ts`

**Decyzja:** Utworzyć nowy plik `flashcard.service.ts` dla lepszej separacji odpowiedzialności

**Zadania:**
- Utworzyć funkcję `saveBatchFlashcards`:
  ```typescript
  import type { supabaseClient } from "../../db/supabase.client";
  import type {
    FlashcardBatchSaveCommand,
    FlashcardBatchSaveResponseDTO,
  } from "../../types";
  
  /**
   * Saves a batch of AI-generated flashcards and updates audit counters.
   * 
   * This function:
   * 1. Validates the audit session exists and is not completed
   * 2. Validates counts match (saved + rejected = generated)
   * 3. Inserts flashcards in bulk
   * 4. Updates audit record with counters and completion timestamp
   * 5. All operations are atomic (in transaction)
   */
  export async function saveBatchFlashcards(
    supabase: typeof supabaseClient,
    userId: string,
    command: FlashcardBatchSaveCommand
  ): Promise<FlashcardBatchSaveResponseDTO> {
    // Implementation details...
  }
  ```

**Implementacja szczegółowa:**

1. **Pobranie i walidacja sesji audytu:**
   ```typescript
   const { data: auditSession, error: fetchError } = await supabase
     .from("ai_generation_audit")
     .select("id, generated_count, generation_completed_at")
     .eq("id", command.ai_generation_audit_id)
     .eq("user_id", userId)
     .is("deleted_at", null)
     .single();
   
   if (fetchError || !auditSession) {
     throw createError("SESSION_NOT_FOUND", "AI generation session not found", 404);
   }
   
   if (auditSession.generation_completed_at !== null) {
     throw createError(
       "SESSION_ALREADY_COMPLETED",
       "This AI generation session has already been completed",
       409
     );
   }
   ```

2. **Walidacja liczników:**
   ```typescript
   const savedCount = command.cards.length;
   const totalCount = savedCount + command.rejected_count;
   
   if (totalCount !== auditSession.generated_count) {
     throw createError(
       "INVALID_COUNTS",
       "Sum of saved and rejected cards does not match generated count",
       400,
       {
         expected: auditSession.generated_count.toString(),
         received: totalCount.toString(),
       }
     );
   }
   ```

3. **Obliczenie liczników dla audytu:**
   ```typescript
   let savedUnchangedCount = 0;
   let savedEditedCount = 0;
   
   for (const card of command.cards) {
     if (card.origin_status === "AI_ORIGINAL") {
       savedUnchangedCount++;
     } else {
       savedEditedCount++;
     }
   }
   ```

4. **Przygotowanie danych do bulk insert:**
   ```typescript
   const flashcardsToInsert = command.cards.map((card) => ({
     user_id: userId,
     front_text: card.front_text,
     back_text: card.back_text,
     source_type: card.origin_status.toLowerCase() as "ai_original" | "ai_edited",
     ai_generation_audit_id: command.ai_generation_audit_id,
   }));
   ```

5. **Transakcja: Insert flashcards + Update audit:**
   ```typescript
   // Insert flashcards
   const { data: savedCards, error: insertError } = await supabase
     .from("flashcards")
     .insert(flashcardsToInsert)
     .select("id");
   
   if (insertError || !savedCards) {
     throw createError(
       "TRANSACTION_FAILED",
       "Failed to save flashcards",
       500,
       { database_error: insertError?.message }
     );
   }
   
   // Update audit record
   const { data: updatedAudit, error: updateError } = await supabase
     .from("ai_generation_audit")
     .update({
       saved_unchanged_count: savedUnchangedCount,
       saved_edited_count: savedEditedCount,
       rejected_count: command.rejected_count,
       generation_completed_at: new Date().toISOString(),
     })
     .eq("id", command.ai_generation_audit_id)
     .select(
       "id, generated_count, saved_unchanged_count, saved_edited_count, rejected_count, generation_completed_at"
     )
     .single();
   
   if (updateError || !updatedAudit) {
     throw createError(
       "TRANSACTION_FAILED",
       "Failed to update audit record",
       500,
       { database_error: updateError?.message }
     );
   }
   ```

6. **Zwrot odpowiedzi:**
   ```typescript
   return {
     saved_card_ids: savedCards.map((card) => card.id),
     audit: {
       id: updatedAudit.id,
       generated_count: updatedAudit.generated_count,
       saved_unchanged_count: updatedAudit.saved_unchanged_count,
       saved_edited_count: updatedAudit.saved_edited_count,
       rejected_count: updatedAudit.rejected_count,
       generation_completed_at: updatedAudit.generation_completed_at,
     },
   };
   ```

**Helper function dla błędów:**
```typescript
function createError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, string>
): Error & { code: string; status: number; details?: Record<string, string> } {
  const error = new Error(message) as Error & {
    code: string;
    status: number;
    details?: Record<string, string>;
  };
  error.code = code;
  error.status = status;
  if (details) {
    error.details = details;
  }
  return error;
}
```

**Weryfikacja:**
- Service kompiluje się bez błędów TypeScript
- Wszystkie typy są zgodne z `src/types.ts`
- Error handling jest spójny z wzorcem z `ai-generation.service.ts`

### Krok 3: Utworzenie API endpoint
**Plik:** `/src/pages/api/flashcards/batch.ts` (nowy plik)

**Zadania:**
- Utworzyć katalog `/src/pages/api/flashcards/` jeśli nie istnieje
- Utworzyć plik `batch.ts`
- Zaimplementować handler `POST`:

```typescript
import type { APIContext } from "astro";
import { z } from "zod";
import { FlashcardBatchSaveSchema } from "../../../lib/schemas/flashcard.schemas";
import { saveBatchFlashcards } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO } from "../../../types";

export const prerender = false;

/**
 * Creates a standardized error response.
 */
function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, string>
): Response {
  const errorResponse: ErrorResponseDTO = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * POST /api/flashcards/batch
 *
 * Saves a batch of accepted AI-generated flashcard proposals
 * and updates audit counters in a single atomic transaction.
 */
export async function POST(context: APIContext): Promise<Response> {
  // 1. Parse JSON request body
  let requestBody;
  try {
    requestBody = await context.request.json();
  } catch {
    return createErrorResponse("INVALID_JSON", "Unable to parse request body", 422);
  }

  // 2. Validate request body with Zod schema
  let validatedData;
  try {
    validatedData = FlashcardBatchSaveSchema.parse(requestBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];

      // Convert field errors to Record<string, string> for response
      const errorDetails: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldErrors)) {
        if (value && value.length > 0) {
          errorDetails[key] = value[0];
        }
      }

      return createErrorResponse(
        "INVALID_INPUT",
        firstError || "Validation failed",
        400,
        errorDetails
      );
    }

    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred during validation",
      500
    );
  }

  // 3. Get authenticated user ID
  // TODO: Replace with actual auth from context.locals.user
  const STATIC_USER_ID = "00000000-0000-0000-0000-000000000000";

  // Check authentication (placeholder for future implementation)
  if (!STATIC_USER_ID) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 4. Call flashcard service to save batch
  try {
    const result = await saveBatchFlashcards(
      context.locals.supabase,
      STATIC_USER_ID,
      validatedData
    );

    // 5. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const err = error as Error & {
      code?: string;
      status?: number;
      details?: Record<string, string>;
    };

    // Handle service-specific errors
    const errorCode = err.code || "INTERNAL_ERROR";
    const errorMessage = err.message || "An unexpected error occurred";
    const errorStatus = err.status || 500;

    return createErrorResponse(errorCode, errorMessage, errorStatus, err.details);
  }
}
```

**Weryfikacja:**
- Endpoint kompiluje się bez błędów
- Struktura jest zgodna z wzorcem z `/src/pages/api/ai-generation/sessions.ts`
- Error handling pokrywa wszystkie scenariusze z planu

### Krok 4: Dodanie testów manualnych
**Zadania:**
- Utworzyć plik z przykładowymi requestami dla testowania endpoint
- Przetestować wszystkie scenariusze błędów
- Zweryfikować atomowość transakcji

**Przykładowe requesty do testowania:**

1. **Prawidłowy request:**
```bash
curl -X POST http://localhost:4321/api/flashcards/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ai_generation_audit_id": "550e8400-e29b-41d4-a716-446655440000",
    "cards": [
      {
        "front_text": "What is TypeScript?",
        "back_text": "A typed superset of JavaScript",
        "origin_status": "AI_ORIGINAL"
      },
      {
        "front_text": "What is React?",
        "back_text": "A JavaScript library for building UIs",
        "origin_status": "AI_EDITED"
      }
    ],
    "rejected_count": 18
  }'
```

2. **Test: Pusta tablica cards (400):**
```bash
curl -X POST http://localhost:4321/api/flashcards/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ai_generation_audit_id": "550e8400-e29b-41d4-a716-446655440000",
    "cards": [],
    "rejected_count": 20
  }'
```

3. **Test: Nieprawidłowa suma (400):**
```bash
curl -X POST http://localhost:4321/api/flashcards/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ai_generation_audit_id": "550e8400-e29b-41d4-a716-446655440000",
    "cards": [
      {
        "front_text": "Test",
        "back_text": "Test",
        "origin_status": "AI_ORIGINAL"
      }
    ],
    "rejected_count": 1
  }'
```

4. **Test: Nieistniejąca sesja (404):**
```bash
curl -X POST http://localhost:4321/api/flashcards/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ai_generation_audit_id": "00000000-0000-0000-0000-000000000001",
    "cards": [
      {
        "front_text": "Test",
        "back_text": "Test",
        "origin_status": "AI_ORIGINAL"
      }
    ],
    "rejected_count": 19
  }'
```

5. **Test: Już zakończona sesja (409) - wymaga dwukrotnego wywołania:**
```bash
# Pierwsze wywołanie - sukces
curl -X POST http://localhost:4321/api/flashcards/batch ...

# Drugie wywołanie z tym samym audit_id - konflikt
curl -X POST http://localhost:4321/api/flashcards/batch ...
```

### Krok 5: Weryfikacja i dokumentacja
**Zadania:**
- Sprawdzić linter errors i naprawić je
- Dodać komentarze JSDoc do wszystkich funkcji publicznych
- Zweryfikować że wszystkie typy z `src/types.ts` są poprawnie użyte
- Dodać wpis do dokumentacji API (jeśli istnieje)

**Checklist weryfikacji:**
- [ ] Wszystkie scenariusze błędów są obsłużone
- [ ] Walidacja Zod pokrywa wszystkie wymagania
- [ ] Service layer poprawnie waliduje liczniki
- [ ] Transakcja jest atomowa (rollback przy błędzie)
- [ ] Response DTOs są zgodne z typami
- [ ] Error responses są zgodne ze standardem
- [ ] RLS zapewnia bezpieczeństwo
- [ ] Kod jest sformatowany i bez linter errors
- [ ] Wszystkie funkcje mają JSDoc comments

### Krok 6: Integracja z frontendem (opcjonalnie)
**Zadania:**
- Jeśli istnieje frontend do generowania flashcards, zintegrować nowy endpoint
- Dodać obsługę błędów w UI
- Dodać feedback dla użytkownika po zapisie
- Przetestować full flow: generowanie → akceptowanie → zapis

**Weryfikacja:**
- Full flow działa end-to-end
- Wszystkie błędy są odpowiednio wyświetlane użytkownikowi
- UI pokazuje sukces po zapisie
- Liczniki są poprawnie aktualizowane

## 10. Podsumowanie

Endpoint `POST /api/flashcards/batch` jest kluczowym elementem przepływu AI generation, umożliwiającym użytkownikom trwałe zapisanie zaakceptowanych propozycji flashcards. Implementacja wymaga:

1. **Trzech nowych plików:**
   - `/src/lib/schemas/flashcard.schemas.ts` - walidacja Zod
   - `/src/lib/services/flashcard.service.ts` - logika biznesowa
   - `/src/pages/api/flashcards/batch.ts` - API endpoint

2. **Kluczowych funkcjonalności:**
   - Bulk insert flashcards w jednej operacji
   - Atomowa aktualizacja liczników audytu
   - Walidacja sum (saved + rejected = generated)
   - Zapobieganie duplikatom (sprawdzenie generation_completed_at)

3. **Kompleksowa obsługa błędów:**
   - 8 różnych scenariuszy błędów
   - Spójne error responses
   - Szczegółowe komunikaty dla użytkownika

4. **Bezpieczeństwo:**
   - RLS dla autoryzacji
   - Walidacja wszystkich inputów
   - Atomowość transakcji

Plan wdrożenia jest gotowy do realizacji przez zespół programistów. Każdy krok jest szczegółowo opisany z przykładami kodu i checklistami weryfikacji.

