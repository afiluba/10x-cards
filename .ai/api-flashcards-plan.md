# API Endpoint Implementation Plan: GET /api/flashcards

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania listy fiszek należących do uwierzytelnionego użytkownika. Obsługuje zaawansowane funkcje takie jak:
- Paginacja wyników
- Filtrowanie po typie źródła (AI_ORIGINAL, AI_EDITED, MANUAL)
- Filtrowanie po dacie aktualizacji
- Wyszukiwanie pełnotekstowe w treści fiszek
- Sortowanie po różnych polach
- Opcjonalne wyświetlanie usuniętych fiszek (z wymaganymi uprawnieniami)

Endpoint zwraca dane w formacie zgodnym z `FlashcardListResponseDTO`, zawierającym tablicę fiszek oraz metadata paginacji.

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
`/api/flashcards`

### Parametry zapytania

#### Opcjonalne parametry:

| Parametr | Typ | Domyślna wartość | Walidacja | Opis |
|----------|-----|------------------|-----------|------|
| `page` | number | 1 | min: 1 | Numer strony wyników |
| `page_size` | number | 20 | min: 1, max: 100 | Liczba elementów na stronie |
| `source_type` | string[] | - | enum: AI_ORIGINAL\|AI_EDITED\|MANUAL | Filtrowanie po typie źródła (możliwe wielokrotne podanie) |
| `updated_after` | string | - | ISO-8601 timestamp | Filtruje fiszki zaktualizowane po podanej dacie |
| `include_deleted` | boolean | false | boolean | Włącza wyświetlanie miękko usuniętych fiszek (wymaga uprawnień) |
| `search` | string | - | string | Wyszukiwanie fragmentów w front_text i back_text |
| `sort` | string | created_at:desc | pattern: (created_at\|updated_at):(asc\|desc) | Określa pole i kierunek sortowania |

### Request Body
Brak (metoda GET)

### Nagłówki
- `Authorization: Bearer <token>` (wymagane - token Supabase Auth)

## 3. Wykorzystywane typy

### DTOs (z src/types.ts):

```typescript
// Response wrapper
interface FlashcardListResponseDTO {
  data: FlashcardDTO[];
  pagination: PaginationMetaDTO;
}

// Single flashcard DTO
interface FlashcardDTO {
  id: string;
  front_text: string;
  back_text: string;
  source_type: FlashcardSourceType;
  ai_generation_audit_id: string | null;
  created_at: string; // ISO-8601
  updated_at: string; // ISO-8601
}

// Pagination metadata
interface PaginationMetaDTO {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

// Error response
interface ErrorResponseDTO {
  error: ErrorDTO;
}

interface ErrorDTO {
  code: string;
  message: string;
  details?: Record<string, string>;
}
```

### Command Models (z src/types.ts):

```typescript
// Query parameters model
interface FlashcardListQueryCommand {
  page?: number;
  page_size?: number;
  source_type?: FlashcardSourceType[];
  updated_after?: IsoDateTimeString;
  include_deleted?: boolean;
  search?: string;
  sort?: FlashcardSortParam;
}

// Supporting types
type FlashcardSourceType = "AI_ORIGINAL" | "AI_EDITED" | "MANUAL";
type FlashcardSortParam = `${FlashcardSortableField}:${SortDirection}`;
type FlashcardSortableField = "created_at" | "updated_at";
type SortDirection = "asc" | "desc";
```

### Zod Schemas (do utworzenia w src/lib/schemas/flashcard.schemas.ts):

```typescript
// Schema dla query parameters
const FlashcardListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  source_type: z.union([
    z.enum(["AI_ORIGINAL", "AI_EDITED", "MANUAL"]),
    z.array(z.enum(["AI_ORIGINAL", "AI_EDITED", "MANUAL"]))
  ]).optional().transform(val => val ? (Array.isArray(val) ? val : [val]) : undefined),
  updated_after: z.string().datetime().optional(),
  include_deleted: z.union([
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false),
    z.boolean()
  ]).optional().default(false),
  search: z.string().trim().min(1).optional(),
  sort: z.string()
    .regex(/^(created_at|updated_at):(asc|desc)$/)
    .default("created_at:desc")
    .optional()
});
```

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK):

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "front_text": "What is the capital of France?",
      "back_text": "Paris",
      "source_type": "AI_ORIGINAL",
      "ai_generation_audit_id": "660e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-10-13T10:00:00.000Z",
      "updated_at": "2025-10-13T10:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 92,
    "total_pages": 5
  }
}
```

### Odpowiedzi błędów:

#### 400 Bad Request - nieprawidłowe parametry:
```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMETERS",
    "message": "Invalid query parameters provided",
    "details": {
      "page": "Must be at least 1",
      "page_size": "Must not exceed 100",
      "sort": "Invalid format, expected 'field:direction'"
    }
  }
}
```

#### 401 Unauthorized - brak uwierzytelnienia:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 403 Forbidden - brak uprawnień do include_deleted:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to view deleted flashcards"
  }
}
```

#### 500 Internal Server Error:
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### Interakcje z bazą danych:

1. **Count Query** - zliczenie wszystkich pasujących rekordów:
   ```sql
   SELECT COUNT(*) 
   FROM flashcards 
   WHERE user_id = $1 
     AND (deleted_at IS NULL OR $include_deleted = true)
     AND ($source_types IS NULL OR source_type = ANY($source_types))
     AND ($updated_after IS NULL OR updated_at > $updated_after)
     AND ($search IS NULL OR (front_text ILIKE $search OR back_text ILIKE $search))
   ```

2. **Data Query** - pobranie stronicowanych danych:
   ```sql
   SELECT id, front_text, back_text, source_type, ai_generation_audit_id, created_at, updated_at
   FROM flashcards 
   WHERE user_id = $1 
     AND (deleted_at IS NULL OR $include_deleted = true)
     AND ($source_types IS NULL OR source_type = ANY($source_types))
     AND ($updated_after IS NULL OR updated_at > $updated_after)
     AND ($search IS NULL OR (front_text ILIKE $search OR back_text ILIKE $search))
   ORDER BY $sort_field $sort_direction
   LIMIT $page_size OFFSET $offset
   ```

## 6. Względy bezpieczeństwa

### Uwierzytelnianie:
- **Wymagane:** Token Supabase Auth w nagłówku Authorization
- **Sprawdzenie:** `const { data: { user } } = await supabase.auth.getUser()`
- **Brak tokena/nieprawidłowy token:** 401 Unauthorized

### Autoryzacja:
- **Row Level Security (RLS):** Automatyczne filtrowanie po `user_id` na poziomie bazy danych
- **Polityka RLS:** `user_id = auth.uid() AND deleted_at IS NULL` (dla zwykłych operacji)
- **Parametr include_deleted:** 
  - Wymaga sprawdzenia uprawnień użytkownika
  - Domyślnie tylko administratorzy/użytkownicy z elevated permissions
  - Jeśli brak uprawnień -> 403 Forbidden

### Walidacja danych wejściowych:
- **Zod schema:** Walidacja wszystkich parametrów query przed przetwarzaniem
- **Sanitizacja:** Automatyczna przez Zod (trim, coerce, transform)
- **SQL Injection:** Ochrona przez parametryzowane zapytania Supabase SDK
- **XSS:** Brak ryzyka (read-only endpoint, dane nie są renderowane bezpośrednio)

### Ochrona przed nadużyciami:
- **Rate limiting:** Rozważyć implementację na poziomie middleware (np. max 100 req/min per user)
- **Page size limit:** Maksimum 100 elementów na stronę (zapobiega przeciążeniu)
- **Search query limit:** Rozważyć minimalną długość (np. 2-3 znaki) dla wydajności

### Bezpieczne logowanie:
- **NIE logować:** Tokenów, wrażliwych danych użytkownika
- **Logować:** User ID, parametry query (bez PII), kody błędów, timestamp
- **Format:** Strukturalne logi JSON dla łatwiejszej analizy


### Krok 2: Implementacja service layer (src/lib/services/flashcard.service.ts)

Dodać funkcję `listFlashcards` do istniejącego service:

```typescript
/**
 * Lists flashcards for authenticated user with filtering, pagination, and search.
 * 
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID
 * @param query - Query parameters for filtering and pagination
 * @returns Promise resolving to paginated flashcard list with metadata
 * @throws Error with specific code and status for various failures
 */
export async function listFlashcards(
  supabase: typeof supabaseClient,
  userId: string,
  query: FlashcardListQueryCommand
): Promise<FlashcardListResponseDTO> {
  // 1. Parse sort parameter
  const [sortField, sortDirection] = (query.sort || "created_at:desc").split(":") as [
    FlashcardSortableField,
    SortDirection
  ];

  // 2. Build base query
  let queryBuilder = supabase
    .from("flashcards")
    .select("id, front_text, back_text, source_type, ai_generation_audit_id, created_at, updated_at", { count: "exact" })
    .eq("user_id", userId);

  // 3. Apply filters
  if (!query.include_deleted) {
    queryBuilder = queryBuilder.is("deleted_at", null);
  }

  if (query.source_type && query.source_type.length > 0) {
    const dbSourceTypes = query.source_type.map(st => st.toLowerCase());
    queryBuilder = queryBuilder.in("source_type", dbSourceTypes);
  }

  if (query.updated_after) {
    queryBuilder = queryBuilder.gt("updated_at", query.updated_after);
  }

  if (query.search) {
    const searchPattern = `%${query.search}%`;
    queryBuilder = queryBuilder.or(`front_text.ilike.${searchPattern},back_text.ilike.${searchPattern}`);
  }

  // 4. Apply sorting
  queryBuilder = queryBuilder.order(sortField, { ascending: sortDirection === "asc" });

  // 5. Apply pagination
  const page = query.page || 1;
  const pageSize = query.page_size || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  queryBuilder = queryBuilder.range(from, to);

  // 6. Execute query
  const { data, error, count } = await queryBuilder;

  if (error) {
    throw createError("DATABASE_ERROR", "Failed to fetch flashcards", 500, {
      database_error: error.message
    });
  }

  // 7. Transform to DTOs
  const flashcardDTOs: FlashcardDTO[] = (data || []).map(card => ({
    id: card.id,
    front_text: card.front_text,
    back_text: card.back_text,
    source_type: card.source_type.toUpperCase() as FlashcardSourceType,
    ai_generation_audit_id: card.ai_generation_audit_id,
    created_at: card.created_at,
    updated_at: card.updated_at
  }));

  // 8. Calculate pagination metadata
  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // 9. Return response
  return {
    data: flashcardDTOs,
    pagination: {
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages
    }
  };
}
```

### Krok 3: Utworzenie Astro endpoint (src/pages/api/flashcards/index.ts)

Utworzyć nowy plik dla GET handler:

```typescript
import type { APIRoute } from "astro";
import { FlashcardListQuerySchema } from "../../../lib/schemas/flashcard.schemas";
import { listFlashcards } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO } from "../../../types";

export const prerender = false;

/**
 * GET /api/flashcards
 * Lists flashcards with pagination, filtering, and search
 */
export const GET: APIRoute = async (context) => {
  try {
    // 1. Get Supabase client from context
    const supabase = context.locals.supabase;
    if (!supabase) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Database client not available"
        }
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Handle multiple source_type values
    const sourceTypes = url.searchParams.getAll("source_type");
    if (sourceTypes.length > 0) {
      queryParams.source_type = sourceTypes.length === 1 ? sourceTypes[0] : sourceTypes;
    }

    const validationResult = FlashcardListQuerySchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach(err => {
        const field = err.path.join(".");
        details[field] = err.message;
      });

      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "INVALID_QUERY_PARAMETERS",
          message: "Invalid query parameters provided",
          details
        }
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const validatedQuery = validationResult.data;

    // 4. Check permissions for include_deleted
    // TODO: Implement actual permission check based on user roles
    // For now, we'll allow it for demonstration purposes
    // In production, check user.app_metadata.role or similar
    if (validatedQuery.include_deleted) {
      // Example permission check (adjust based on your auth implementation):
      // const hasPermission = user.app_metadata?.role === "admin";
      // if (!hasPermission) {
      //   const errorResponse: ErrorResponseDTO = {
      //     error: {
      //       code: "FORBIDDEN",
      //       message: "Insufficient permissions to view deleted flashcards"
      //     }
      //   };
      //   return new Response(JSON.stringify(errorResponse), {
      //     status: 403,
      //     headers: { "Content-Type": "application/json" }
      //   });
      // }
    }

    // 5. Call service layer
    const result = await listFlashcards(supabase, user.id, validatedQuery);

    // 6. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    // Log error for monitoring
    console.error("[GET /api/flashcards] Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Handle custom service errors
    if (error instanceof Error && "code" in error && "status" in error) {
      const serviceError = error as Error & { 
        code: string; 
        status: number; 
        details?: Record<string, string> 
      };
      
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: serviceError.code,
          message: serviceError.message,
          details: serviceError.details
        }
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: serviceError.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Handle unexpected errors
    const errorResponse: ErrorResponseDTO = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred"
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

### Kompatybilność z istniejącym kodem:

- Endpoint używa tego samego wzorca co `POST /api/flashcards/batch`
- Service layer rozszerza istniejący `flashcard.service.ts`
- Schemas rozszerzają istniejący `flashcard.schemas.ts`
- Typy zgodne z `src/types.ts`
- Error handling konsystentny z resztą API

### Dependency na inne endpoints:

Ten endpoint jest niezależny, ale komplementarny do:
- `POST /api/flashcards` - tworzenie pojedynczych fiszek
- `POST /api/flashcards/batch` - tworzenie wielu fiszek
- `GET /api/flashcards/{id}` - pobranie pojedynczej fiszki
- `PATCH /api/flashcards/{id}` - aktualizacja fiszki
- `DELETE /api/flashcards/{id}` - usunięcie fiszki

