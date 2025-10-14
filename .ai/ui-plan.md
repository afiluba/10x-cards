# Architektura UI dla 10x-cards

## 1. Przegląd struktury UI

Aplikacja 10x-cards w wersji MVP składa się z dwóch głównych widoków dla zalogowanych użytkowników:
- **Generowanie fiszek AI** (`/generate`) - wklejanie tekstu, generowanie propozycji, akceptacja/edycja
- **Biblioteka fiszek** (`/my-cards`) - przeglądanie, wyszukiwanie, edycja, usuwanie i ręczne tworzenie fiszek

Architektura priorytetuje prostotę implementacji przy zachowaniu metryk jakościowych (75% akceptacji fiszek AI, 75% fiszek tworzonych z AI).

**Poza zakresem MVP:**
- Landing page i widoki dla niezalogowanych użytkowników
- Sesja nauki z algorytmem spaced repetition (US-009)
- Widok kosza i przywracania usuniętych fiszek
- Dedykowany widok statystyk (statystyki zintegrowane w `/my-cards`)

## 2. Lista widoków

### 2.1. Widok: Generowanie Fiszek AI

**Ścieżka:** `/generate`

**Główny cel:** Umożliwienie użytkownikowi szybkiego wygenerowania propozycji fiszek z tekstu źródłowego oraz ich przeglądu, edycji i akceptacji przed zapisem do biblioteki.

**Kluczowe informacje do wyświetlenia:**
- Pole tekstowe do wklejenia materiału źródłowego (1000-32768 znaków)
- Licznik znaków (live update)
- Stan przetwarzania (spinner, komunikat "Generuję fiszki...")
- Lista propozycji AI (front_text, back_text, status edycji)
- Licznik zaakceptowanych propozycji (X/Y)
- Wizualne oznaczenie edytowanych kart (badge "Edytowano", kolorowy border)

**Kluczowe komponenty widoku:**

1. **Formularz generowania**
   - Textarea z walidacją długości (1000-32768 znaków)
   - Live character counter
   - Przycisk "Generuj fiszki" (disabled podczas ładowania i przy nieprawidłowej długości)
   - Komunikaty walidacji inline

2. **Stan ładowania**
   - Centralny spinner z komunikatem
   - Disabled przycisk z tekstem "Generowanie..."
   - Informacja o szacowanym czasie (do 30 sekund)

3. **Sekcja propozycji AI**
   - Nagłówek z akcjami grupowymi ("Zaznacz wszystkie", "Odznacz wszystkie")
   - Licznik "Zaakceptowano: X/Y"
   - Lista kart propozycji:
     - Front text i back text widoczne jednocześnie
     - Checkbox "Zaakceptuj"
     - Przycisk "Edytuj" → inline editing mode (textarea dla front i back)
     - Przycisk "Odrzuć" → usunięcie z listy, inkrementacja licznika odrzuceń
     - Badge "Edytowano" dla zmodyfikowanych propozycji
     - Kolorowy border dla edytowanych (np. fioletowy)
   - Główny przycisk "Zapisz fiszki (X)" (aktywny tylko gdy X > 0)

**UX, dostępność i względy bezpieczeństwa:**

*UX:*
- Autofocus na textarea przy wejściu na stronę
- Walidacja real-time z komunikatami "Tekst musi mieć min. 1000 znaków" / "Przekroczono limit 32768 znaków"
- Potwierdzenie przed opuszczeniem strony jeśli są niezapisane propozycje (window.beforeunload)
- Keyboard shortcuts: Ctrl+Enter → generuj, ESC → zamknij inline edit
- Loading skeleton podczas generowania
- Retry button dla błędów API (429, 502)

*Dostępność:*
- Label dla textarea: "Wklej tekst do wygenerowania fiszek"
- ARIA live region dla licznika znaków (aria-live="polite")
- ARIA labels dla checkboxów: "Zaakceptuj propozycję {numer}"
- Focus trap w inline edit mode
- Komunikaty błędów połączone z polami przez aria-describedby
- Semantyczny HTML: `<form>`, `<button>`, `<label>`

*Bezpieczeństwo:*
- XSS prevention: sanityzacja contentu z API (DOMPurify)
- CSRF token w POST requests
- Rate limiting feedback (429 → komunikat + timer countdown)
- Client-side i server-side walidacja długości tekstu

**Integracja z API:**
- **POST /api/ai-generation/sessions** - generowanie propozycji
  - Request: `{ input_text, model_identifier: null, client_request_id: null }`
  - Response: `{ session: { id, ... }, proposals: [...] }`
- **POST /api/flashcards/batch** - zapis zaakceptowanych
  - Request: `{ ai_generation_audit_id, cards: [...], rejected_count }`
  - Response: `{ saved_card_ids: [...], audit: {...} }`

**Obsługa błędów:**
- 400 (walidacja) → inline error pod textarea
- 429 (rate limit) → error state "Zbyt wiele żądań, spróbuj za {X} sekund" + retry
- 502 (OpenRouter błąd) → error state "Błąd generowania, spróbuj ponownie" + retry button
- 500 → toast notification "Wystąpił błąd systemowy"
- Brak propozycji → komunikat "Nie udało się wygenerować fiszek, spróbuj z innym tekstem"

**Mapowanie User Stories:**
- US-001: Generowanie propozycji fiszek przez AI
- US-002: Walidacja tekstu wejściowego i obsługa błędów
- US-003: Przegląd i akceptacja propozycji
- US-004: Edycja propozycji AI przed akceptacją
- US-012: Informowanie o stanie systemu

---

### 2.2. Widok: Biblioteka Fiszek

**Ścieżka:** `/my-cards`

**Główny cel:** Przeglądanie, wyszukiwanie, filtrowanie, edycja i usuwanie zapisanych fiszek oraz ręczne tworzenie nowych fiszek.

**Kluczowe informacje do wyświetlenia:**
- Lista fiszek użytkownika (front_text, back_text, source_type, updated_at)
- Wyniki wyszukiwania i filtrowania
- Paginacja (aktualna strona, łączna liczba stron, rozmiar strony)
- Statystyki: łączna liczba fiszek, podział na AI_ORIGINAL, AI_EDITED, MANUAL
- Procent akceptacji AI (dla metryki sukcesu)

**Kluczowe komponenty widoku:**

1. **Panel statystyk** (górna część widoku)
   - Łączna liczba fiszek
   - Podział: AI (oryginalne), AI (edytowane), Manualne
   - Procent akceptacji AI (obliczany po stronie klienta)

2. **Panel filtrów i wyszukiwania**
   - Search box z placeholderem "Szukaj w fiszkach..."
   - Dropdown filtr source_type (Wszystkie / AI oryginalne / AI edytowane / Manualne)
   - Dropdown sortowanie (Najnowsze / Najstarsze / Ostatnio edytowane)
   - Parametry synchronizowane z URL

3. **Przycisk dodania fiszki**
   - "Dodaj fiszkę" → otwiera modal z formularzem ręcznego tworzenia

4. **Lista fiszek (interaktywne flipcards)**
   - Grid layout (3 kolumny desktop, 2 tablet, 1 mobile)
   - Animacja flip przy kliknięciu (front → back)
   - Front widoczny domyślnie, back po kliknięciu lub hover
   - Każda karta zawiera:
     - Front text
     - Source type label (tekstowa, prosta etykieta)
     - Data ostatniej modyfikacji
     - Akcje: ikona ołówka "Edytuj", ikona kosza "Usuń"

5. **Inline editing mode**
   - Po kliknięciu "Edytuj" karta zamienia się w formularz:
     - Textarea dla front_text (max 500 znaków)
     - Textarea dla back_text (max 500 znaków)
     - Character counters
     - Przyciski "Zapisz" i "Anuluj"
   - PATCH /api/flashcards/{id}

6. **Modal usuwania**
   - Tytuł: "Czy na pewno usunąć fiszkę?"
   - Podgląd front_text
   - Przyciski "Anuluj" (ESC) i "Usuń" (czerwony, destructive)
   - Po usunięciu: toast "Fiszka została usunięta" + odświeżenie listy
   - DELETE /api/flashcards/{id}

7. **Modal/formularz ręcznego tworzenia**
   - Tytuł: "Utwórz nową fiszkę"
   - Textarea front_text (max 500 znaków) z counter
   - Textarea back_text (max 500 znaków) z counter
   - Walidacja real-time
   - Przyciski "Zapisz" i "Anuluj"
   - POST /api/flashcards

8. **Paginacja**
   - Numerowane strony (1, 2, 3, ..., N)
   - Przyciski Poprzednia/Następna
   - Dropdown rozmiaru strony (10 / 20 / 50 / 100)
   - Parametry page i page_size w URL

**UX, dostępność i względy bezpieczeństwa:**

*UX:*
- Debounced search (300ms delay)
- Deep linking - filtry i paginacja w URL (możliwość share linków)
- Loading skeleton podczas fetch
- Placeholder "Nie masz jeszcze żadnych fiszek. Przejdź do Generuj fiszki" gdy pusta lista
- Brak wyników wyszukiwania: "Nie znaleziono fiszek pasujących do '{query}'"
- Keyboard navigation: Tab przez karty, Enter → flip, E → edit, Delete → usuń
- Focus management: po usunięciu focus wraca na listę
- Optimistic UI (opcjonalne): natychmiastowe usunięcie z listy, rollback przy błędzie

*Dostępność:*
- Semantyczny HTML: `<article>` dla kart fiszek, `<nav>` dla paginacji
- ARIA label dla search: "Wyszukaj fiszki po treści"
- Role="region" dla listy fiszek z aria-label="Lista fiszek"
- Modal: focus trap, ESC → zamknij, focus na "Anuluj" przy otwarciu
- aria-current="page" dla aktywnej strony paginacji
- Screen reader announcements dla akcji (toast z role="status")

*Bezpieczeństwo:*
- Sanityzacja treści fiszek przed wyświetleniem (DOMPurify)
- Row Level Security w Supabase - użytkownik widzi tylko własne fiszki
- Walidacja parametrów URL (page, page_size w dozwolonych zakresach)
- CSRF protection w modyfikujących requestach

**Integracja z API:**
- **GET /api/flashcards** - lista z paginacją i filtrami
  - Params: `page`, `page_size`, `search`, `source_type`, `sort`
  - Response: `{ data: [...], pagination: {...} }`
- **POST /api/flashcards** - ręczne tworzenie
  - Request: `{ front_text, back_text, source_type: "MANUAL" }`
  - Response: utworzona fiszka
- **PATCH /api/flashcards/{id}** - edycja
  - Request: `{ front_text, back_text, source_type }`
  - Response: zaktualizowana fiszka
- **DELETE /api/flashcards/{id}** - usuwanie
  - Response: `204 No Content`

**Obsługa błędów:**
- Pusta lista → placeholder z linkiem do `/generate`
- Brak wyników wyszukiwania → komunikat informacyjny
- 500 (błąd API) → toast "Błąd ładowania fiszek" + retry button
- 401 (sesja wygasła) → redirect do logowania + toast
- 409 (fiszka już usunięta) → toast "Fiszka już została usunięta"
- 400 (walidacja przy edycji) → inline error "Tekst przekracza 500 znaków"
- Błąd paginacji (page > total_pages) → redirect do page=1

**Mapowanie User Stories:**
- US-005: Ręczne tworzenie fiszek
- US-006: Edycja zapisanej fiszki
- US-007: Usuwanie fiszek
- US-008: Przeglądanie biblioteki fiszek
- US-011: Monitorowanie jakości fiszek AI (statystyki)
- US-012: Informowanie o stanie systemu

---

### 2.3. Komponent: Top Navbar (Nawigacja)

**Główny cel:** Nawigacja między głównymi sekcjami aplikacji i zarządzanie sesją użytkownika.

**Kluczowe informacje do wyświetlenia:**
- Logo aplikacji
- Linki do głównych sekcji
- Informacje o zalogowanym użytkowniku (avatar)
- Opcja wylogowania

**Struktura Desktop (≥ md):**
```
[Logo: 10x-cards]    [Generuj fiszki]  [Moje fiszki]                    [Avatar ▼]
                                                                          └─ Wyloguj
```

**Struktura Mobile (< md):**
```
[Logo: 10x-cards]                                                         [☰]

Hamburger menu rozwija (Sheet component):
- Generuj fiszki
- Moje fiszki
- ───────────
- Wyloguj
```

**Kluczowe komponenty:**
- Button/Link (nawigacja)
- Dropdown Menu (menu użytkownika - desktop)
- Sheet (mobile menu)
- Avatar (ikona użytkownika)

**UX, dostępność i względy bezpieczeństwa:**

*UX:*
- Logo klikalny → redirect do `/generate` (domyślna strona)
- Active state dla aktualnej strony (underline, bold, highlight)
- Hover states dla wszystkich interaktywnych elementów
- Touch-friendly rozmiary na mobile (min 44px height)
- Sticky navbar (nie znika przy scroll)
- Smooth transitions między stanami

*Dostępność:*
- Semantyczny `<nav>` element
- aria-current="page" dla aktywnej strony
- Keyboard navigation: Tab przez linki, Enter → navigate
- Mobile menu: focus trap, ESC → zamknij
- Skip to main content link (dla screen readers)

*Bezpieczeństwo:*
- Bezpieczne wylogowanie (czyszczenie sessionStorage, cookies)
- Przekierowanie na stronę logowania po wylogowaniu
- Obsługa błędów wylogowania → toast notification

**Mapowanie User Stories:**
- US-010: Bezpieczny dostęp do prywatnych fiszek

---

## 3. Mapa podróży użytkownika

### 3.1. Główny przepływ: Generowanie i akceptacja fiszek

**Krok 1: Wejście na stronę generowania**
- Użytkownik klika "Generuj fiszki" w navbar lub wchodzi bezpośrednio na `/generate`
- Wyświetla się pusty formularz z autofocus na textarea

**Krok 2: Wprowadzenie tekstu źródłowego**
- Użytkownik wkleja lub wpisuje tekst (1000-32768 znaków)
- Live counter pokazuje aktualną długość: "5432 / 32768 znaków"
- Walidacja real-time:
  - < 1000 znaków → komunikat "Tekst musi mieć min. 1000 znaków", przycisk disabled
  - > 32768 znaków → komunikat "Przekroczono limit 32768 znaków", przycisk disabled
  - 1000-32768 → przycisk "Generuj fiszki" aktywny

**Krok 3: Generowanie propozycji**
- Użytkownik klika "Generuj fiszki"
- POST /api/ai-generation/sessions
- UI pokazuje:
  - Spinner centralny
  - Komunikat "Generuję fiszki... To może potrwać do 30 sekund"
  - Przycisk zmienia się na disabled z tekstem "Generowanie..."

**Krok 4: Otrzymanie propozycji**
- API zwraca session + proposals (do 20 fiszek)
- UI wyświetla sekcję propozycji:
  - Nagłówek z akcjami grupowymi
  - Licznik "Zaakceptowano: 0/15"
  - Lista kart propozycji

**Krok 5: Przegląd i decyzje użytkownika**

*Opcja A: Akceptacja propozycji*
- Użytkownik zaznacza checkbox "Zaakceptuj" na wybranych kartach
- Licznik aktualizuje się live: "Zaakceptowano: 8/15"

*Opcja B: Edycja propozycji*
- Użytkownik klika "Edytuj" na karcie
- Karta zamienia się w inline form (2x textarea)
- Użytkownik wprowadza zmiany
- Klika "Zapisz" → karta wraca do widoku z badge "Edytowano" i kolorowym borderem
- Checkbox automatycznie zaznaczony (edytowana = zaakceptowana)
- Licznik aktualizuje się

*Opcja C: Odrzucenie propozycji*
- Użytkownik klika "Odrzuć" na karcie
- Karta znika z listy
- Licznik odrzuceń++ (wewnętrznie, dla POST batch)
- Licznik "Zaakceptowano" nie zmienia się (Y maleje)

*Opcja D: Akcje grupowe*
- "Zaznacz wszystkie" → wszystkie checkboxy checked
- "Odznacz wszystkie" → wszystkie checkboxy unchecked

**Krok 6: Zapis fiszek**
- Użytkownik klika "Zapisz fiszki (8)"
- POST /api/flashcards/batch z:
  - ai_generation_audit_id (z kroku 3)
  - cards: zaakceptowane i edytowane propozycje
  - rejected_count: liczba odrzuconych
- Sukces:
  - Toast notification "Zapisano 8 fiszek"
  - Przekierowanie do `/my-cards` LUB wyczyszczenie formularza (do decyzji UX)
- Błąd:
  - Toast z komunikatem błędu
  - Propozycje pozostają na ekranie

**Obsługa przypadków brzegowych:**
- Użytkownik próbuje opuścić stronę przed zapisem → potwierdzenie "Masz niezapisane propozycje, czy na pewno opuścić?"
- Błąd generowania (429, 502) → error state z retry button
- Brak propozycji → komunikat informacyjny

---

### 3.2. Przepływ: Przeglądanie i zarządzanie fiszkami

**Krok 1: Wejście na widok biblioteki**
- Użytkownik klika "Moje fiszki" w navbar lub wchodzi na `/my-cards`
- GET /api/flashcards z domyślnymi parametrami (page=1, page_size=20, sort=created_at:desc)
- Wyświetlenie:
  - Panel statystyk (liczby, procent akceptacji)
  - Panel filtrów
  - Lista fiszek (grid layout)
  - Paginacja

**Krok 2: Wyszukiwanie fiszek**
- Użytkownik wpisuje w search box: "react"
- Debounced (300ms) → URL update: `/my-cards?search=react`
- GET /api/flashcards?search=react
- Lista odświeża się z wynikami wyszukiwania
- Jeśli brak wyników → "Nie znaleziono fiszek pasujących do 'react'"

**Krok 3: Filtrowanie i sortowanie**
- Użytkownik wybiera dropdown "Źródło: AI oryginalne"
- URL update: `/my-cards?search=react&source_type=AI_ORIGINAL`
- GET /api/flashcards?search=react&source_type=AI_ORIGINAL
- Lista odświeża się
- Użytkownik wybiera sortowanie "Ostatnio edytowane"
- URL update + API call z sort=updated_at:desc

**Krok 4: Interakcja z fiszkami (flip)**
- Użytkownik klika na kartę fiszki
- CSS/Framer Motion animacja flip
- Wyświetla się back_text
- Ponowne kliknięcie → flip z powrotem do front

**Krok 5: Edycja fiszki**
- Użytkownik klika ikonę ołówka "Edytuj"
- Karta zamienia się w formularz:
  - Textarea front (z aktualnym tekstem)
  - Textarea back (z aktualnym tekstem)
  - Character counters
  - Przyciski "Zapisz" / "Anuluj"

*Opcja A: Zapisanie zmian*
- Użytkownik modyfikuje tekst
- Klika "Zapisz"
- Walidacja (max 500 znaków)
- PATCH /api/flashcards/{id}
- Sukces:
  - Toast "Fiszka zaktualizowana"
  - Karta wraca do normalnego widoku z nowymi danymi
  - updated_at aktualizuje się
  - Jeśli była AI_ORIGINAL → zmienia się na AI_EDITED
- Błąd:
  - Inline error message (np. "Tekst przekracza 500 znaków")

*Opcja B: Anulowanie*
- Użytkownik klika "Anuluj" lub ESC
- Karta wraca do normalnego widoku bez zmian

**Krok 6: Usuwanie fiszki**
- Użytkownik klika ikonę kosza "Usuń"
- Otwiera się modal potwierdzenia:
  - Tytuł "Czy na pewno usunąć fiszkę?"
  - Podgląd front_text
  - Przyciski "Anuluj" i "Usuń"

*Opcja A: Potwierdzenie*
- Użytkownik klika "Usuń"
- DELETE /api/flashcards/{id}
- Sukces:
  - Modal zamyka się
  - Toast "Fiszka została usunięta"
  - Fiszka znika z listy
  - Statystyki aktualizują się
  - Focus wraca na listę

*Opcja B: Anulowanie*
- Użytkownik klika "Anuluj" lub ESC
- Modal zamyka się bez zmian

**Krok 7: Paginacja**
- Użytkownik klika stronę "3" w paginacji
- URL update: `/my-cards?page=3&...`
- GET /api/flashcards?page=3&...
- Lista odświeża się z nowymi danymi
- Scroll do góry strony (smooth scroll)

**Krok 8: Zmiana rozmiaru strony**
- Użytkownik wybiera dropdown "50" jako page_size
- URL update: `/my-cards?page=1&page_size=50&...` (page reset do 1)
- GET /api/flashcards?page=1&page_size=50&...
- Lista odświeża się z 50 fiszkami

---

### 3.3. Przepływ: Ręczne tworzenie fiszki

**Krok 1: Inicjacja tworzenia**
- Użytkownik w `/my-cards` klika przycisk "Dodaj fiszkę"
- Otwiera się modal z formularzem:
  - Tytuł "Utwórz nową fiszkę"
  - Textarea front_text (pusty, max 500)
  - Textarea back_text (pusty, max 500)
  - Character counters (0 / 500)
  - Przyciski "Zapisz" (disabled) i "Anuluj"
- Focus na pierwszym textarea (front)

**Krok 2: Wprowadzenie danych**
- Użytkownik wpisuje tekst w front: "Co to jest TypeScript?"
- Counter aktualizuje się: "26 / 500"
- Przycisk "Zapisz" nadal disabled (wymaga obu pól)
- Użytkownik wpisuje tekst w back: "Typowany nadzbiór JavaScript..."
- Counter: "35 / 500"
- Przycisk "Zapisz" aktywny (oba pola wypełnione, w limitach)

**Krok 3: Walidacja i zapis**
- Użytkownik klika "Zapisz"
- Walidacja:
  - Front i back nie puste
  - Front ≤ 500 znaków
  - Back ≤ 500 znaków
- POST /api/flashcards:
  ```json
  {
    "front_text": "Co to jest TypeScript?",
    "back_text": "Typowany nadzbiór JavaScript...",
    "source_type": "MANUAL"
  }
  ```
- Sukces:
  - Modal zamyka się
  - Toast "Fiszka utworzona"
  - Lista fiszek odświeża się (nowa fiszka na górze przy sort=created_at:desc)
  - Statystyki aktualizują się (Manualne +1)
- Błąd:
  - Komunikat błędu w modalu (np. "Tekst przekracza limit")

**Krok 4: Anulowanie (opcjonalnie)**
- Użytkownik klika "Anuluj" lub ESC
- Potwierdzenie jeśli są niezapisane zmiany: "Odrzucić wprowadzone dane?"
- Modal zamyka się bez zapisu

---

## 4. Układ i struktura nawigacji

### 4.1. Routing

**Główne route'y:**
- `/` → Redirect do `/generate` (domyślna strona dla zalogowanych)
- `/generate` → Widok generowania fiszek AI
- `/my-cards` → Widok biblioteki fiszek
- `/my-cards?page=2&search=react&source_type=AI_ORIGINAL&sort=created_at:desc` → Biblioteka z filtrami (deep linking)

**Przekierowania:**
- Niezalogowany użytkownik na `/generate` lub `/my-cards` → Redirect do `/login` (poza MVP)
- 401 podczas API call → Redirect do `/login` z parametrem `?redirect_back={current_url}`
- `/my-cards?page=999` (page > total_pages) → Redirect do `/my-cards?page=1`

### 4.2. Nawigacja główna (Top Navbar)

**Pozycjonowanie:** Sticky top (pozostaje widoczny przy scroll)

**Layout Desktop (≥ md):**
- **Lewa strona:** Logo "10x-cards" (link do `/generate`)
- **Środek:** 
  - Link "Generuj fiszki" → `/generate` (active state jeśli current)
  - Link "Moje fiszki" → `/my-cards` (active state jeśli current)
- **Prawa strona:**
  - Avatar użytkownika (inicjały lub ikona)
  - Dropdown menu (on click):
    - Opcja "Wyloguj" → logout() → redirect

**Layout Mobile (< md):**
- **Lewa strona:** Logo "10x-cards"
- **Prawa strona:** Hamburger icon (☰)
- **Menu (Sheet component):**
  - Slide-in z prawej lub z góry
  - Focus trap, ESC zamyka
  - Zawiera:
    - Link "Generuj fiszki"
    - Link "Moje fiszki"
    - Separator (linia)
    - "Wyloguj"

**Active state:**
- Aktywny link: underline, bold lub highlight color
- aria-current="page" dla screen readers

**Keyboard navigation:**
- Tab przez linki
- Enter → nawigacja
- W dropdown: Arrow keys, Enter, ESC

### 4.3. Breadcrumbs

**Decyzja:** NIE w MVP (tylko 2 główne widoki, proste nawigacja)

Jeśli w przyszłości dodane zostaną podstrony, rozważyć breadcrumbs.

### 4.4. URL Parameters (State synchronization)

**Wykorzystanie w `/my-cards`:**
- `page` (number) - numer strony paginacji
- `page_size` (number) - rozmiar strony (10/20/50/100)
- `search` (string) - zapytanie wyszukiwania
- `source_type` (enum) - filtr typu źródła
- `sort` (string) - sortowanie (created_at:desc, updated_at:desc, etc.)

**Przykład:** `/my-cards?page=2&page_size=50&search=typescript&source_type=AI_EDITED&sort=updated_at:desc`

**Korzyści:**
- Deep linking - użytkownik może zapisać/udostępnić link do konkretnego widoku
- Browser back/forward działa intuicyjnie
- Refresh strony zachowuje stan filtrów

**Implementacja:**
- `useSearchParams()` (React Router) lub `URLSearchParams` API
- Synchronizacja dwukierunkowa: URL ↔ lokalny stan ↔ API params
- Walidacja parametrów (page ≥ 1, page_size w [10, 20, 50, 100])

---

## 5. Kluczowe komponenty

### 5.1. Komponenty Shadcn/ui (bazowe)

**Używane w całej aplikacji:**
1. **Button** - przyciski akcji, nawigacja
2. **Input** - pola tekstowe (search)
3. **Textarea** - wieloliniowe pola tekstowe
4. **Card** - kontenery dla fiszek i propozycji
5. **Checkbox** - zaznaczanie propozycji
6. **Badge** - oznaczenia (np. "Edytowano")
7. **Dropdown Menu** - filtry, sortowanie, menu użytkownika
8. **Dialog/Modal** - potwierdzenia, formularze
9. **Toast** - powiadomienia
10. **Spinner/Loading** - stany ładowania
11. **Sheet** - mobile menu
12. **Avatar** - ikona użytkownika
13. **Separator** - linie oddzielające

### 5.2. Komponenty Custom (React)

#### 5.2.1. FlashcardFlipCard
**Cel:** Interaktywna karta fiszki z animacją przewracania

**Props:**
- `flashcard` (object) - dane fiszki (id, front_text, back_text, source_type, updated_at)
- `onEdit` (function) - callback edycji
- `onDelete` (function) - callback usuwania

**Stan wewnętrzny:**
- `isFlipped` (boolean) - czy karta jest przewrócona

**Struktura:**
- Front side: front_text, source_type label, akcje (edytuj, usuń)
- Back side: back_text, akcje
- Animacja CSS lub Framer Motion dla płynnego flip
- Kliknięcie karty → toggle isFlipped
- Kliknięcie akcji → event.stopPropagation() (nie flip, tylko akcja)

**Dostępność:**
- role="button" dla karty
- aria-label="Fiszka: {front_text}, kliknij aby przewrócić"
- Keyboard: Enter/Space → flip

---

#### 5.2.2. ProposalCard
**Cel:** Karta propozycji AI z możliwością akceptacji, edycji, odrzucenia

**Props:**
- `proposal` (object) - temporary_id, front_text, back_text
- `isChecked` (boolean) - czy zaakceptowana
- `isEdited` (boolean) - czy edytowana
- `onCheck` (function) - toggle checkbox
- `onEdit` (function) - callback edycji
- `onReject` (function) - callback odrzucenia

**Stan wewnętrzny:**
- `editMode` (boolean) - czy w trybie edycji
- `editData` (object) - { front, back } podczas edycji

**Struktura:**
- Normal mode:
  - Checkbox
  - Front text
  - Back text
  - Badge "Edytowano" jeśli isEdited
  - Border color: fioletowy jeśli isEdited
  - Przyciski: Edytuj, Odrzuć
- Edit mode:
  - Textarea front (z editData.front)
  - Textarea back (z editData.back)
  - Character counters
  - Przyciski: Zapisz, Anuluj

**Dostępność:**
- aria-label dla checkbox: "Zaakceptuj propozycję"
- Focus trap w edit mode
- ESC → anuluj edycję

---

#### 5.2.3. GenerateForm
**Cel:** Formularz do wklejania tekstu i generowania fiszek

**Stan:**
- `inputText` (string) - tekst użytkownika
- `charCount` (number) - długość tekstu
- `isLoading` (boolean) - czy trwa generowanie
- `error` (string | null) - komunikat błędu

**Walidacja:**
- Min 1000 znaków
- Max 32768 znaków
- Real-time feedback

**Funkcje:**
- handleTextChange - update inputText, charCount
- handleSubmit - walidacja, POST API, obsługa odpowiedzi

**Dostępność:**
- Label dla textarea
- aria-live dla counter
- aria-describedby dla błędów

---

#### 5.2.4. ProposalsList
**Cel:** Lista propozycji AI z akcjami grupowymi

**Stan:**
- `proposals` (array) - oryginalne propozycje z API
- `selectedIds` (Set) - IDs zaakceptowanych
- `editedProposals` (Map) - ID → { front, back } dla edytowanych

**Funkcje:**
- selectAll() - zaznacz wszystkie
- deselectAll() - odznacz wszystkie
- handleCheck(id) - toggle selection
- handleEdit(id, data) - zapisz edycję
- handleReject(id) - usuń z listy

**Render:**
- Nagłówek z akcjami grupowymi
- Licznik "Zaakceptowano: X/Y"
- Map przez proposals → ProposalCard
- Przycisk "Zapisz fiszki (X)" (disabled jeśli X === 0)

---

#### 5.2.5. FlashcardsList
**Cel:** Lista fiszek z paginacją, filtrowaniem, wyszukiwaniem

**Stan:**
- `flashcards` (array) - aktualna strona fiszek
- `pagination` (object) - page, page_size, total_items, total_pages
- `filters` (object) - search, source_type, sort
- `isLoading` (boolean)
- `error` (string | null)

**Effects:**
- useEffect na filters/pagination → GET /api/flashcards
- Synchronizacja z URL params

**Render:**
- SearchBar component
- Filters component
- Grid layout dla FlashcardFlipCard
- Pagination component

---

#### 5.2.6. SearchBar
**Cel:** Wyszukiwanie z debouncing

**Props:**
- `value` (string) - aktualne zapytanie
- `onChange` (function) - callback zmiany

**Stan wewnętrzny:**
- `localValue` (string) - lokalna wartość przed debounce

**Funkcje:**
- useDebouncedValue(localValue, 300ms) → wywołuje onChange

**Render:**
- Input z ikoną 🔍
- Placeholder "Szukaj w fiszkach..."
- Clear button (X) jeśli value nie pusty

---

#### 5.2.7. Pagination
**Cel:** Nawigacja między stronami

**Props:**
- `currentPage` (number)
- `totalPages` (number)
- `pageSize` (number)
- `onPageChange` (function)
- `onPageSizeChange` (function)

**Render:**
- Przycisk "Poprzednia" (disabled jeśli page === 1)
- Numerowane przyciski (1, 2, ..., N) - max 7 widocznych, reszta "..."
- Przycisk "Następna" (disabled jeśli page === totalPages)
- Dropdown page_size (10/20/50/100)

**Dostępność:**
- aria-current dla aktywnej strony
- aria-label "Strona {N}"
- Keyboard navigation

---

#### 5.2.8. DeleteConfirmationModal
**Cel:** Potwierdzenie usunięcia fiszki

**Props:**
- `flashcard` (object | null) - fiszka do usunięcia
- `isOpen` (boolean)
- `onConfirm` (function)
- `onCancel` (function)

**Render:**
- Dialog component
- Tytuł "Czy na pewno usunąć fiszkę?"
- Podgląd front_text
- Footer z przyciskami:
  - "Anuluj" (secondary, focus default)
  - "Usuń" (destructive, red)

**Dostępność:**
- Focus trap
- ESC → onCancel
- Focus na "Anuluj" przy otwarciu

---

#### 5.2.9. CreateFlashcardModal
**Cel:** Formularz ręcznego tworzenia fiszki

**Props:**
- `isOpen` (boolean)
- `onClose` (function)
- `onSuccess` (function) - callback po utworzeniu

**Stan:**
- `frontText` (string)
- `backText` (string)
- `errors` (object)
- `isSubmitting` (boolean)

**Funkcje:**
- validate() - sprawdź limity 500 znaków
- handleSubmit() - POST /api/flashcards

**Render:**
- Dialog
- Textarea front (max 500)
- Textarea back (max 500)
- Character counters
- Przyciski: Anuluj, Zapisz

---

### 5.3. Komponenty Layout

#### 5.3.1. TopNavbar
**Cel:** Główna nawigacja

**Stan:**
- `isMenuOpen` (boolean) - mobile menu

**Render Desktop:**
- Logo (link)
- Nav links (Generuj fiszki, Moje fiszki)
- UserMenu (Avatar + Dropdown)

**Render Mobile:**
- Logo
- Hamburger button
- Sheet (menu slide-in)

---

#### 5.3.2. MainLayout
**Cel:** Wrapper dla stron z navbar

**Props:**
- `children` (ReactNode)

**Render:**
```jsx
<div className="min-h-screen">
  <TopNavbar />
  <main className="container mx-auto py-8">
    {children}
  </main>
</div>
```

---

### 5.4. Context Providers

#### 5.4.1. AuthContext
**Stan globalny:**
- `user` (User | null) - dane zalogowanego użytkownika
- `isAuthenticated` (boolean)
- `isLoading` (boolean) - ładowanie stanu auth

**Funkcje:**
- `login(credentials)` - logowanie (poza MVP)
- `logout()` - wylogowanie, clear session, redirect

**Provider:**
- Opakowuje całą aplikację
- useAuth() hook dla dostępu

---

#### 5.4.2. ToastContext (opcjonalne)
Jeśli Shadcn toast wymaga providera, w przeciwnym razie globalny toast instance.

---

## 6. Responsywność

### 6.1. Breakpointy (Tailwind Default)
- **sm: 640px** - małe urządzenia
- **md: 768px** - tablety
- **lg: 1024px** - desktopy
- **xl: 1280px** - duże desktopy
- **2xl: 1536px** - bardzo duże ekrany

### 6.2. Adaptacje layout

**Mobile (< md):**
- Single column layout dla wszystkich widoków
- Hamburger menu navigation (Sheet)
- Flipcards: pełna szerokość, stack vertically
- Panel filtrów: collapsible (Accordion) aby zaoszczędzić przestrzeń
- Search box: pełna szerokość
- Touch-friendly buttons i inputs (min 44px height)
- Paginacja: compact mode (tylko numerki, bez "Poprzednia"/"Następna" tekstu)

**Tablet (md - lg):**
- Możliwe 2 kolumny dla flipcards grid
- Pełna top navbar (bez hamburger)
- Zwiększone paddingi i marginesy
- Dropdowny zamiast collapsibles dla filtrów

**Desktop (≥ lg):**
- Grid 3 kolumny dla flipcards
- Większe karty z więcej white space
- Hover states dla wszystkich interakcji
- Side-by-side layout w inline editing (front/back obok siebie)
- Full-width navbar z wycentrowanymi linkami

### 6.3. Typography scaling
- Headings: responsive (text-2xl md:text-3xl lg:text-4xl)
- Body text: text-sm md:text-base
- Small text (labels, captions): text-xs md:text-sm

### 6.4. Spacing
- Container padding: px-4 md:px-6 lg:px-8
- Section spacing: space-y-6 md:space-y-8 lg:space-y-12

---

## 7. Zarządzanie stanem

### 7.1. Strategia

**Globalny stan (React Context):**
- AuthContext - user, isAuthenticated, logout

**Lokalny stan komponentów (useState):**
- UI state: isFlipped, isEditing, isLoading, isMenuOpen
- Formularze: inputText, frontText, backText, errors
- Propozycje AI (temporary): proposals, selectedIds, editedProposals

**URL Parameters (useSearchParams):**
- `/my-cards`: page, page_size, search, source_type, sort
- Synchronizacja dwukierunkowa: URL ↔ state ↔ API

**SessionStorage (opcjonalnie):**
- Recovery propozycji AI: `ai-proposals-${sessionId}`
- Wykorzystane gdy użytkownik przypadkowo zamknie kartę podczas przeglądu propozycji

**NIE używane w MVP:**
- Redux / Zustand (overkill dla prostej aplikacji)
- Zaawansowany cache (React Query, SWR) - nice to have, ale nie konieczne
- Optimistic updates - nice to have

### 7.2. Data flow

**Generowanie fiszek (/generate):**
```
User input → Local state (inputText)
↓
Submit → POST /api/ai-generation/sessions
↓
Response → Local state (proposals, sessionId)
↓
User actions → Local state (selectedIds, editedProposals, rejectedCount)
↓
Save → POST /api/flashcards/batch
↓
Success → Toast + Redirect to /my-cards
```

**Biblioteka fiszek (/my-cards):**
```
URL params → Local state (filters, pagination)
↓
GET /api/flashcards
↓
Response → Local state (flashcards, pagination)
↓
User changes filters → Update URL params → Trigger new API call
↓
Edit/Delete → PATCH/DELETE API → Refresh list
```

---

## 8. Obsługa błędów i stanów

### 8.1. Typy błędów

**Błędy walidacji (400):**
- Lokalizacja: inline przy polu formularza
- Format: czerwony tekst pod polem, border czerwony
- aria-describedby łączy pole z komunikatem
- Przykład: "Tekst musi mieć minimum 1000 znaków"

**Błędy autoryzacji (401):**
- Akcja: Redirect do /login z parametrem ?redirect_back={current_url}
- Toast: "Sesja wygasła, zaloguj się ponownie"

**Błędy API (429, 502):**
- Lokalizacja: dedykowany error state w miejscu wyników
- Retry button: "Spróbuj ponownie"
- 429 (rate limit): dodatkowy timer countdown "Spróbuj za {X} sekund"
- Przykład: Error component z ikoną, komunikatem, przyciskiem

**Błędy systemowe (500):**
- Lokalizacja: toast notification (nie blokuje UI)
- Komunikat: "Wystąpił błąd systemowy, spróbuj później"
- Opcja zgłoszenia (nice to have): link/przycisk "Zgłoś problem"

**Błędy sieciowe (network failure):**
- Toast: "Brak połączenia z internetem"
- Retry automatyczny po reconnect (opcjonalne)

### 8.2. Stany ładowania

**Podczas API call:**
- Spinner/Loading indicator
- Disabled buttons (prevent double submit)
- Loading skeleton dla list (optional)
- Komunikaty informacyjne (np. "Generuję fiszki...")

**Wzorce:**
- Inline loading: spinner w przycisku
- Full section loading: centralny spinner
- List loading: skeleton cards

### 8.3. Empty states

**Pusta lista fiszek:**
```
┌────────────────────────────────┐
│   📚                           │
│   Nie masz jeszcze fiszek      │
│                                │
│   [Generuj pierwsze fiszki]    │
└────────────────────────────────┘
```

**Brak wyników wyszukiwania:**
```
┌────────────────────────────────┐
│   🔍                           │
│   Nie znaleziono fiszek        │
│   pasujących do "react"        │
│                                │
│   [Wyczyść wyszukiwanie]       │
└────────────────────────────────┘
```

**Brak propozycji AI:**
```
┌────────────────────────────────┐
│   ⚠️                           │
│   Nie udało się wygenerować    │
│   fiszek. Spróbuj z innym      │
│   tekstem.                     │
│                                │
│   [Spróbuj ponownie]           │
└────────────────────────────────┘
```

---

## 9. Bezpieczeństwo UI

### 9.1. XSS Prevention
- Sanityzacja contentu z API przed wyświetleniem (DOMPurify)
- React auto-escaping dla user input
- Nie używać dangerouslySetInnerHTML (chyba że absolutnie konieczne i z DOMPurify)

### 9.2. CSRF Protection
- CSRF tokens w modyfikujących requestach (POST, PATCH, DELETE)
- Astro middleware obsługuje CSRF
- Frontend wysyła token w header lub body

### 9.3. Autoryzacja
- Protected routes: middleware redirect jeśli !isAuthenticated
- API calls z auth headers (Supabase SDK automatycznie)
- Row Level Security w Supabase (backend) - użytkownik widzi tylko swoje dane

### 9.4. Rate Limiting Feedback
- 429 response → komunikat "Zbyt wiele żądań"
- Timer countdown do następnej próby
- Disable przycisku submit podczas cooldown

### 9.5. Secure Session Management
- Tokens w httpOnly cookies (zarządzane przez Supabase)
- Logout czyści sessionStorage i cookies
- Session timeout → auto redirect do login

---

## 10. Dostępność (A11y)

### 10.1. Wymagania WCAG AA

**Kontrast kolorów:**
- Minimum 4.5:1 dla normalnego tekstu
- Minimum 3:1 dla dużego tekstu (18pt+)
- Narzędzia: Chrome DevTools, axe

**Nawigacja klawiaturą:**
- Wszystkie interaktywne elementy dostępne przez Tab
- Focus indicators (outline) widoczne i wyraźne
- Logiczny tab order
- Shortcuts: Enter (submit), ESC (zamknij), Arrow keys (dropdown)

**Screen readers:**
- Semantyczny HTML: `<nav>`, `<main>`, `<article>`, `<button>`, `<label>`
- ARIA labels dla ikon bez tekstu: aria-label="Edytuj fiszkę"
- ARIA live regions dla dynamicznych aktualizacji: aria-live="polite" (counter, toast)
- aria-current="page" dla aktywnej strony nawigacji
- role="status" dla toast notifications

**Formularze:**
- `<label>` dla każdego input/textarea
- aria-describedby łączy pole z komunikatem błędu
- Required fields oznaczone wizualnie (*) i aria-required="true"
- Error messages związane z polami

**Modals i dialogs:**
- Focus trap (focus pozostaje w modalu)
- ESC zamyka modal
- Focus wraca na trigger element po zamknięciu
- aria-modal="true"
- aria-labelledby (tytuł modalu)

### 10.2. Testing A11y
- Automated: axe DevTools, Lighthouse
- Manual: keyboard navigation, screen reader (NVDA, VoiceOver)
- Checklist WCAG 2.1 Level AA

---

## 11. Mapowanie User Stories → UI

| User Story | Widok | Komponenty | API Endpoints |
|-----------|-------|------------|---------------|
| US-001: Generowanie propozycji fiszek | `/generate` | GenerateForm, ProposalsList, ProposalCard | POST /api/ai-generation/sessions |
| US-002: Walidacja i obsługa błędów | `/generate` | GenerateForm (validation), Error states | - |
| US-003: Przegląd i akceptacja | `/generate` | ProposalsList, ProposalCard (checkbox) | POST /api/flashcards/batch |
| US-004: Edycja propozycji przed akceptacją | `/generate` | ProposalCard (edit mode) | POST /api/flashcards/batch |
| US-005: Ręczne tworzenie fiszek | `/my-cards` | CreateFlashcardModal | POST /api/flashcards |
| US-006: Edycja zapisanej fiszki | `/my-cards` | FlashcardFlipCard (inline edit) | PATCH /api/flashcards/{id} |
| US-007: Usuwanie fiszek | `/my-cards` | DeleteConfirmationModal | DELETE /api/flashcards/{id} |
| US-008: Przeglądanie biblioteki | `/my-cards` | FlashcardsList, SearchBar, Pagination | GET /api/flashcards |
| US-009: Synchronizacja z powtórkami | Poza MVP | - | - |
| US-010: Bezpieczny dostęp | Wszystkie | AuthContext, Protected routes | - |
| US-011: Monitorowanie jakości | `/my-cards` | Stats panel (sekcja widoku) | GET /api/flashcards (aggregacja po source_type) |
| US-012: Stany systemu | Wszystkie | Loading spinners, Toast, Error states | - |

---

## 12. Pain Points użytkownika → Rozwiązania UI

| Pain Point | Rozwiązanie UI |
|-----------|----------------|
| Czasochłonne ręczne tworzenie fiszek | Formularz generowania AI z prostym UX: wklej tekst → generuj → zaakceptuj |
| Niska jakość wygenerowanych fiszek | Możliwość edycji przed akceptacją (inline editing), odrzucanie niepasujących |
| Brak kontroli nad treścią | Pełna edytowalność wszystkich fiszek (AI i manualne), możliwość usunięcia |
| Trudność w znalezieniu konkretnych fiszek | Search box z debouncing, filtrowanie po source_type, sortowanie, paginacja |
| Chaos w bibliotece fiszek | Statystyki (liczby, procenty), filtry, etykiety source_type, daty modyfikacji |
| Strach przed utratą danych | Potwierdzenia przed usunięciem, komunikaty sukcesu po zapisie, soft delete (backend) |
| Niepewność co do stanu operacji | Loading states (spinner), komunikaty "Generuję...", toast notifications, error messages |
| Frustracja przy błędach API | Retry buttons, jasne komunikaty błędów, fallback UI, nie blokowanie całej aplikacji |
| Nieintuicyjna nawigacja | Top navbar z prostymi linkami, active states, breadcrumbs (jeśli potrzebne w przyszłości) |
| Konieczność wielokrotnego wpisywania filtrów | URL synchronization - filtry w URL, deep linking, browser back/forward działa |

---

## 13. Nierozwiązane kwestie (Do wyjaśnienia)

### 13.1. Design System
- **Paleta kolorów:** Primary, secondary, error, success, warning (konkretne hex values)
- **Typography:** Font family, scale (h1-h6, body, small), line heights
- **Spacing system:** Czy tylko Tailwind defaults czy custom scale?
- **Custom theme dla Shadcn/ui:** Dostosowanie do brand identity

### 13.2. Animacje
- **Biblioteka:** CSS transitions, Framer Motion, inne?
- **Flip animation:** Czas trwania (300ms?), easing function (ease-in-out?)
- **Transitions:** Fade in/out, slide, scale dla modali i toastów

### 13.3. Autentykacja (poza MVP ale do zaplanowania)
- **Flow logowania/rejestracji:** Supabase Auth UI czy custom?
- **Social logins:** Google, GitHub?
- **Email verification:** Wymagane czy opcjonalne?
- **Password reset:** Flow i UI

### 13.4. Metryki i Analytics
- **Tracking:** Google Analytics, Plausible, inne?
- **Eventy do trackowania:** Generowanie fiszek, akceptacja, edycja, usuwanie
- **Privacy:** GDPR compliance, cookie consent banner

### 13.5. Performance
- **Code splitting:** Lazy loading komponentów (React.lazy)
- **Bundle size:** Limity, monitoring (webpack-bundle-analyzer)
- **Images:** Optimization strategy (jeśli będą używane)
- **API caching:** SWR, React Query w przyszłości?

### 13.6. Internationalization
- **MVP:** Tylko język polski
- **Przyszłość:** Struktura kodu przygotowana pod i18n (react-i18next?)
- **Słowniki:** Gdzie przechowywać tłumaczenia?

### 13.7. Error Recovery
- **Retry logic:** Automatyczny czy manualny? Ile prób?
- **Offline mode:** Komunikat czy partial functionality?
- **Fallback UI:** Dla krytycznych błędów (error boundary)

### 13.8. Accessibility Testing
- **Narzędzia:** axe DevTools, Lighthouse, pa11y
- **Manual testing:** Screen reader (NVDA, JAWS, VoiceOver)
- **User testing:** Z osobami używającymi assistive technologies

### 13.9. Współdzielenie i Export (poza MVP)
- **Przygotowanie struktury:** Czy już teraz myśleć o API endpoints?
- **Formaty exportu:** JSON, CSV, Anki?
- **Publiczne zestawy:** Widoki browse/search

### 13.10. Statystyki - Szczegóły
- **Widok:** Sekcja w /my-cards czy osobny /stats?
- **Metryki:** Procent akceptacji, AI vs manual ratio, activity timeline?
- **Filtering:** Po okresie (tydzień, miesiąc, rok)?
- **Wizualizacje:** Wykresy (Chart.js, Recharts)?

---

## 14. Następne kroki implementacji

### Faza 1: Fundament (Tydzień 1)
1. ✅ Setup projektu (Astro, React, Tailwind, Shadcn/ui)
2. ✅ Konfiguracja Supabase clients i types
3. ✅ AuthContext i protected routes
4. ⬜ MainLayout i TopNavbar (responsive)
5. ⬜ Design tokens (colors, typography, spacing)

### Faza 2: Generowanie fiszek (Tydzień 2)
6. ⬜ GenerateForm component (textarea, validation, counter)
7. ⬜ POST /api/ai-generation/sessions integration
8. ⬜ ProposalCard component (checkbox, inline edit, reject)
9. ⬜ ProposalsList component (list, group actions, counter)
10. ⬜ POST /api/flashcards/batch integration
11. ⬜ Error states i loading states dla /generate

### Faza 3: Biblioteka fiszek (Tydzień 3)
12. ⬜ FlashcardFlipCard component (flip animation)
13. ⬜ SearchBar component (debounced search)
14. ⬜ Filters component (source_type, sort)
15. ⬜ Pagination component
16. ⬜ FlashcardsList integration z GET /api/flashcards
17. ⬜ URL params synchronization

### Faza 4: CRUD operacje (Tydzień 4)
18. ⬜ Inline editing w FlashcardFlipCard
19. ⬜ PATCH /api/flashcards/{id} integration
20. ⬜ DeleteConfirmationModal component
21. ⬜ DELETE /api/flashcards/{id} integration
22. ⬜ CreateFlashcardModal component
23. ⬜ POST /api/flashcards integration

### Faza 5: Polish i testing (Tydzień 5)
24. ⬜ Stats panel w /my-cards
25. ⬜ Toast notifications (wszystkie flow)
26. ⬜ Error boundaries
27. ⬜ A11y audit i fixes (axe, keyboard nav)
28. ⬜ Responsive testing (mobile, tablet, desktop)
29. ⬜ Browser testing (Chrome, Firefox, Safari)

### Faza 6: Deployment
30. ⬜ Performance optimization (code splitting, lazy loading)
31. ⬜ SEO meta tags
32. ⬜ Production build i testing
33. ⬜ Deployment (Vercel/Netlify)
34. ⬜ Monitoring setup (errors, analytics)

---

**Wersja:** 1.0  
**Data utworzenia:** 2025-10-14  
**Status:** Zaplanowano - gotowe do implementacji

