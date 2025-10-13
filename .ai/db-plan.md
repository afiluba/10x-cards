1. Tabele

**Typy pomocnicze**
- `flashcard_source_type` enum: `AI_ORIGINAL`, `AI_EDITED`, `MANUAL`.

**flashcards**
- Kolumny: `id` uuid PK default gen_random_uuid(); `user_id` uuid not null; `front_text` text not null; `back_text` text not null; `source_type` flashcard_source_type not null; `ai_generation_audit_id` uuid references ai_generation_audit(id); `created_at` timestamptz not null default now(); `updated_at` timestamptz not null default now(); `deleted_at` timestamptz.
- Ograniczenia: `CHECK (char_length(front_text) BETWEEN 1 AND 500)`; `CHECK (char_length(back_text) BETWEEN 1 AND 500)`; `CHECK (user_id IS NOT NULL)`.
- Uwagi: miękkie usuwanie poprzez `deleted_at`; aktualizacja znacznika `updated_at` przez trigger; powiązanie opcjonalne z `ai_generation_audit`.

**ai_generation_audit**
- Kolumny: `id` uuid PK default gen_random_uuid(); `user_id` uuid not null; `client_request_id` uuid not null default gen_random_uuid(); `model_identifier` text; `generation_started_at` timestamptz not null default now(); `generation_completed_at` timestamptz; `generated_count` integer not null; `saved_unchanged_count` integer not null; `saved_edited_count` integer not null; `rejected_count` integer not null; `created_at` timestamptz not null default now(); `updated_at` timestamptz not null default now(); `deleted_at` timestamptz.
- Ograniczenia: `CHECK (generated_count >= 0)`; `CHECK (saved_unchanged_count >= 0)`; `CHECK (saved_edited_count >= 0)`; `CHECK (rejected_count >= 0)`; `CHECK (generated_count = saved_unchanged_count + saved_edited_count + rejected_count)`; `UNIQUE (user_id, client_request_id)`.
- Uwagi: przechowuje dane agregowane dla każdej sesji generowania AI; brak przechowywania tekstu źródłowego.

2. Relacje między tabelami
- `ai_generation_audit` 1:N `flashcards`; fiszki AI opcjonalnie wskazują sesję audytową, fiszki manualne mają `ai_generation_audit_id` null.

3. Indeksy
- `flashcards_user_deleted_idx` na `flashcards(user_id, deleted_at)` przyspiesza filtrowanie aktywnych fiszek.
- `flashcards_source_type_idx` na `flashcards(source_type)` dla raportów źródeł.
- `ai_generation_audit_user_created_idx` na `ai_generation_audit(user_id, created_at)` dla raportowania metryk.

4. Zasady PostgreSQL (RLS)
- `flashcards`: ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY; polityki SELECT/UPDATE/DELETE `USING (user_id = auth.uid() AND deleted_at IS NULL)`; INSERT `WITH CHECK (user_id = auth.uid())`.
- `ai_generation_audit`: RLS z politykami SELECT/UPDATE/DELETE `USING (user_id = auth.uid() AND deleted_at IS NULL)`; INSERT `WITH CHECK (user_id = auth.uid())`.

5. Dodatkowe uwagi
- Wszystkie tabele korzystają z miękkiego usuwania (`deleted_at`); zadanie harmonogramu powinno fizycznie usuwać rekordy starsze niż 30 dni od `deleted_at`.
- Zaleca się globalny trigger aktualizujący `updated_at = now()` na `flashcards`,  `ai_generation_audit` przy każdej modyfikacji.
- Wymagane rozszerzenie `pgcrypto` (lub równoważne) dla funkcji `gen_random_uuid()`.
- `user_id` we wszystkich tabelach przechowuje identyfikator z Supabase Auth i jest podstawą Polityk RLS.