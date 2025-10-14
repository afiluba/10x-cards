# Plan REST API

## 1. Zasoby
- `Flashcard` — wspierany przez tabelę `flashcards`; reprezentuje fiszkę użytkownika (pytanie/odpowiedź) z polem `source_type`, opcjonalnym powiązaniem z `ai_generation_audit` oraz miękkim usuwaniem przez `deleted_at`.
- `AIGenerationSession` — wspierany przez tabelę `ai_generation_audit`; przechowuje każde żądanie generowania AI wraz z licznikami, znacznikami czasowymi, `client_request_id` oraz właścicielem (`user_id`).
- `Metric` — wirtualny zasób agregujący statystyki wykorzystania AI i współczynniki akceptacji na podstawie `flashcards` oraz `ai_generation_audit`.

## 2. Punkty końcowe

### Flashcards
- **Metoda / Ścieżka:** `GET /api/flashcards`
  - **Opis:** Lista aktywnych fiszek należących do uwierzytelnionego użytkownika z paginacją, filtrowaniem i wyszukiwaniem.
  - **Parametry zapytania:**
    - `page` (liczba, domyślnie `1`, minimum `1`).
    - `page_size` (liczba, domyślnie `20`, maksimum `100`).
    - `source_type` (enum `AI_ORIGINAL|AI_EDITED|MANUAL`, możliwość wielokrotnego podania).
    - `updated_after` (znacznik ISO-8601; filtruje `updated_at` większe od wartości).
    - `include_deleted` (boolean; wymaga podwyższonych uprawnień, aby pokazać rekordy miękko usunięte).
    - `search` (string; wyszukiwanie fragmentów w `front_text` i `back_text`, np. przez `ILIKE` lub pełnotekstowo).
    - `sort` (string; domyślnie `created_at:desc`, obsługuje `created_at|updated_at` z `asc|desc`).
  - **JSON żądania:** brak.
  - **JSON odpowiedzi:**
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "front_text": "string",
          "back_text": "string",
          "source_type": "AI_ORIGINAL",
          "ai_generation_audit_id": "uuid or null",
          "created_at": "2025-10-13T10:00:00Z",
          "updated_at": "2025-10-13T10:05:00Z"
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
  - **Kody sukcesu:** `200 OK`.
  - **Kody błędów:** `400 Bad Request` (błędna paginacja/filtry), `401 Unauthorized`, `403 Forbidden` (brak uprawnień do `include_deleted`), `500 Internal Server Error`.

- **Metoda / Ścieżka:** `POST /api/flashcards`
  - **Opis:** Utworzenie fiszki ręcznie
  - **JSON żądania:**
    ```json
    {
      "front_text": "string (1-500 chars)",
      "back_text": "string (1-500 chars)",
      "source_type": "MANUAL",
      "ai_generation_audit_id": "uuid or null"
    }
    ```
  - **JSON odpowiedzi:**
    ```json
    {
      "id": "uuid",
      "front_text": "string",
      "back_text": "string",
      "source_type": "MANUAL",
      "ai_generation_audit_id": null,
      "created_at": "2025-10-13T10:05:00Z",
      "updated_at": "2025-10-13T10:05:00Z"
    }
    ```
  - **Kody sukcesu:** `201 Created`.
  - **Kody błędów:** `400 Bad Request` (walidacja), `401 Unauthorized`, `404 Not Found` (brak powiązanej sesji `ai_generation_audit_id`), `409 Conflict` (duplikat rozliczenia), `422 Unprocessable Entity` (ograniczenie bazy), `500 Internal Server Error`.

- **Metoda / Ścieżka:** `POST /api/flashcards/batch`
  - **Opis:** Zapis wielu zaakceptowanych propozycji AI oraz zbilansowanie liczników audytu w jednej transakcji.
  - **JSON żądania:**
    ```json
    {
      "ai_generation_audit_id": "uuid",
      "cards": [
        {
          "front_text": "string (1-500 chars)",
          "back_text": "string (1-500 chars)",
          "origin_status": "AI_ORIGINAL|AI_EDITED"
        }
      ],
      "rejected_count": 0
    }
    ```
  - **JSON odpowiedzi:**
    ```json
    {
      "saved_card_ids": ["uuid"],
      "audit": {
        "id": "uuid",
        "generated_count": 10,
        "saved_unchanged_count": 6,
        "saved_edited_count": 3,
        "rejected_count": 1,
        "generation_completed_at": "2025-10-13T10:06:00Z"
      }
    }
    ```
  - **Kody sukcesu:** `200 OK`.
  - **Kody błędów:** `400 Bad Request` (pusta lista, rozbieżność sum), `401 Unauthorized`, `404 Not Found` (brak sesji), `409 Conflict` (sesja już rozliczona), `422 Unprocessable Entity`, `500 Internal Server Error`.

- **Metoda / Ścieżka:** `GET /api/flashcards/{id}`
  - **Opis:** Pobranie pojedynczej fiszki należącej do użytkownika.
  - **JSON żądania:** brak.
  - **JSON odpowiedzi:** obiekt fiszki jak w listingu.
  - **Kody sukcesu:** `200 OK`.
  - **Kody błędów:** `401 Unauthorized`, `404 Not Found`, `410 Gone` (poza okresem przywrócenia), `500 Internal Server Error`.

- **Metoda / Ścieżka:** `PATCH /api/flashcards/{id}`
  - **Opis:** Częściowa aktualizacja pól fiszki (np. edycja tekstu, zmiana `source_type`).
  - **JSON żądania:**
    ```json
    {
      "front_text": "string (1-500 chars)",
      "back_text": "string (1-500 chars)",
      "source_type": "AI_EDITED|MANUAL"
    }
    ```
  - **JSON odpowiedzi:** zaktualizowana fiszka.
  - **Kody sukcesu:** `200 OK`.
  - **Kody błędów:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `409 Conflict` (konflikt etag), `422 Unprocessable Entity`, `500 Internal Server Error`.

- **Metoda / Ścieżka:** `DELETE /api/flashcards/{id}`
  - **Opis:** Miękkie usunięcie fiszki poprzez ustawienie `deleted_at`.
  - **JSON żądania:** opcjonalnie `{ "reason": "string" }` do logów audytowych.
  - **JSON odpowiedzi:** `{ "id": "uuid", "deleted_at": "2025-10-13T10:10:00Z" }` przy zwracaniu treści.
  - **Kody sukcesu:** `204 No Content` (preferowane) lub `200 OK`.
  - **Kody błędów:** `401 Unauthorized`, `404 Not Found`, `409 Conflict` (już usunięta), `500 Internal Server Error`.

- **Metoda / Ścieżka:** `POST /api/flashcards/{id}/restore`
  - **Opis:** Przywrócenie miękko usuniętej fiszki w okresie retencji.
  - **JSON żądania:** brak.
  - **JSON odpowiedzi:** przywrócona fiszka.
  - **Kody sukcesu:** `200 OK`.
  - **Kody błędów:** `401 Unauthorized`, `404 Not Found`, `410 Gone` (po retencji lub po trwałym usunięciu), `500 Internal Server Error`.


### AI Generation Sessions
- **Metoda / Ścieżka:** `POST /api/ai-generation/sessions`
  - **Opis:** Rozpoczęcie generowania fiszek przez AI, zapis audytu, wywołanie OpenRouter i zwrot propozycji.
  - **JSON żądania:**
    ```json
    {
      "input_text": "string (1000-32768 chars)",
      "model_identifier": "string or null",
      "client_request_id": "uuid or null"
    }
    ```
  - **JSON odpowiedzi:**
    ```json
    {
      "session": {
        "id": "uuid",
        "client_request_id": "uuid",
        "model_identifier": "openrouter/model",
        "generation_started_at": "2025-10-13T10:00:00Z"
      },
      "proposals": [
        {
          "temporary_id": "uuid",
          "front_text": "string",
          "back_text": "string"
        }
      ]
    }
    ```
  - **Kody sukcesu:** `201 Created`.
  - **Kody błędów:** `400 Bad Request` (długość tekstu), `401 Unauthorized`, `409 Conflict` (duplikat `client_request_id`), `422 Unprocessable Entity` (błąd parsowania), `429 Too Many Requests`, `502 Bad Gateway` (błąd OpenRouter), `500 Internal Server Error`.


### Kontrakt błędu
```json
{
  "error": {
    "code": "string",
    "message": "human readable",
    "details": {
      "field": "description"
    }
  }
}
```