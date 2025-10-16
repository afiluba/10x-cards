# Plan implementacji widoku Biblioteka Fiszek

## 1. Przegląd
Widok "Biblioteka Fiszek" umożliwia użytkownikom przeglądanie, wyszukiwanie, filtrowanie i zarządzanie swoimi fiszkami. Główny cel to zapewnienie intuicyjnego interfejsu do ręcznego tworzenia nowych fiszek, edycji istniejących oraz usuwania niepotrzebnych, z integracją statystyk jakości fiszek generowanych przez AI.

## 2. Routing widoku
Widok dostępny pod ścieżką `/my-cards`.

## 3. Struktura komponentów
- MyCardsPage (główny kontener)
  - StatsPanel (statystyki)
  - FiltersPanel (filtry i wyszukiwanie)
  - AddFlashcardButton (przycisk dodania)
  - FlashcardGrid (lista fiszek)
    - FlashcardCard (pojedyncza fiszka z flip)
    - EmptyState (placeholder)
  - Pagination (paginacja)
  - CreateFlashcardModal (modal tworzenia)
  - DeleteFlashcardModal (modal usunięcia)

## 4. Szczegóły komponentów
### MyCardsPage
- **Opis komponentu**: Główny komponent strony zarządzający stanem globalnym, wywołaniami API i koordynacją podkomponentów. Odpowiada za ładowanie danych przy montowaniu i synchronizację z URL.
- **Główne elementy**: Container div z StatsPanel, FiltersPanel, AddFlashcardButton, FlashcardGrid, Pagination, oraz ukryte modale CreateFlashcardModal i DeleteFlashcardModal.
- **Obsługiwane zdarzenia**: onMount (fetch danych), onFilterChange (refetch), onModalOpen/Close.
- **Warunki walidacji**: Brak specyficznych warunków walidacji; deleguje do podkomponentów.
- **Typy**: FlashcardListResponseDTO, StatsViewModel, FiltersViewModel, PaginationViewModel.
- **Propsy**: Brak (jako strona Astro, nie przyjmuje propsów).

### StatsPanel
- **Opis komponentu**: Wyświetla statystyki biblioteki fiszek: łączną liczbę, podział na typy źródła i procent akceptacji AI.
- **Główne elementy**: Trzy karty (Card z Shadcn/ui) z ikonami i liczbami, jedna dla procentu z progress barem.
- **Obsługiwane zdarzenia**: Brak interaktywnych zdarzeń.
- **Warunki walidacji**: Brak.
- **Typy**: StatsViewModel.
- **Propsy**: stats: StatsViewModel.

### FiltersPanel
- **Opis komponentu**: Formularz z polem wyszukiwania, dropdownami dla filtrów i sortowania, synchronizowany z URL.
- **Główne elementy**: Input (search), Select (source_type), Select (sort), Button (clear filters).
- **Obsługiwane zdarzenia**: onSearchChange (debounced), onFilterChange, onClear.
- **Warunki walidacji**: Search min 1 char, source_type enum, sort regex pattern.
- **Typy**: FiltersViewModel.
- **Propsy**: filters: FiltersViewModel, onFiltersChange: (filters) => void.

### AddFlashcardButton
- **Opis komponentu**: Przycisk otwierający modal tworzenia nowej fiszki.
- **Główne elementy**: Button z ikonką plus.
- **Obsługiwane zdarzenia**: onClick → open modal.
- **Warunki walidacji**: Brak.
- **Typy**: Brak.
- **Propsy**: onOpenModal: () => void.

### FlashcardGrid
- **Opis komponentu**: Grid wyświetlający fiszki w responsywnym layoucie, obsługuje empty state.
- **Główne elementy**: Grid container z FlashcardCard komponentami lub EmptyState.
- **Obsługiwane zdarzenia**: Deleguje do dzieci.
- **Warunki walidacji**: Brak.
- **Typy**: FlashcardViewModel[].
- **Propsy**: flashcards: FlashcardViewModel[], onEdit, onDelete.

### FlashcardCard
- **Opis komponentu**: Pojedyncza fiszka z animacją flip, akcjami edycji i usunięcia.
- **Główne elementy**: Div z flip animation (front/back), buttons edit/delete.
- **Obsługiwane zdarzenia**: onFlip, onEdit, onDelete.
- **Warunki walidacji**: Brak.
- **Typy**: FlashcardViewModel.
- **Propsy**: flashcard: FlashcardViewModel, onEdit, onDelete.

### FlashcardEditForm
- **Opis komponentu**: Inline formularz edycji fiszki z textarea i przyciskami.
- **Główne elementy**: Textarea dla front/back, counters, buttons Save/Cancel.
- **Obsługiwane zdarzenia**: onSave, onCancel, onChange (walidacja).
- **Warunki walidacji**: Front/back max 500 chars, required.
- **Typy**: FlashcardUpdateCommand.
- **Propsy**: flashcard: FlashcardViewModel, onSave, onCancel.

### CreateFlashcardModal
- **Opis komponentu**: Modal z formularzem tworzenia nowej fiszki.
- **Główne elementy**: Dialog z textarea, counters, buttons.
- **Obsługiwane zdarzenia**: onSubmit, onCancel.
- **Warunki walidacji**: Front/back max 500, required.
- **Typy**: FlashcardCreateCommand.
- **Propsy**: isOpen: boolean, onClose, onSubmit.

### DeleteFlashcardModal
- **Opis komponentu**: Modal potwierdzenia usunięcia fiszki.
- **Główne elementy**: Dialog z preview text, buttons Cancel/Delete.
- **Obsługiwane zdarzenia**: onConfirm, onCancel.
- **Warunki walidacji**: Brak.
- **Typy**: Brak.
- **Propsy**: isOpen, flashcard: FlashcardViewModel, onConfirm, onCancel.

### Pagination
- **Opis komponentu**: Komponent paginacji z numerowanymi stronami i dropdownem rozmiaru.
- **Główne elementy**: Nav z buttons, Select dla page_size.
- **Obsługiwane zdarzenia**: onPageChange, onPageSizeChange.
- **Warunki walidacji**: Page min 1, page_size 10/20/50/100.
- **Typy**: PaginationViewModel.
- **Propsy**: pagination: PaginationViewModel, onChange.

## 5. Typy
- FlashcardDTO: id (string), front_text (string), back_text (string), source_type (FlashcardSourceType), ai_generation_audit_id (string | null), created_at (string), updated_at (string).
- FlashcardListResponseDTO: data (FlashcardDTO[]), pagination (PaginationMetaDTO).
- FlashcardViewModel: rozszerza FlashcardDTO o isFlipped (boolean), isEditing (boolean), isDeleting (boolean).
- StatsViewModel: totalCards (number), aiOriginalCount (number), aiEditedCount (number), manualCount (number), aiAcceptanceRate (number).
- FiltersViewModel: search (string), sourceType (FlashcardSourceType[]), sort (FlashcardSortParam), page (number), pageSize (number).
- PaginationViewModel: currentPage (number), totalPages (number), pageSize (number), totalItems (number).
- FlashcardCreateCommand: front_text (string), back_text (string), source_type ("MANUAL").
- FlashcardUpdateCommand: front_text? (string), back_text? (string), source_type? ("AI_EDITED" | "MANUAL").

## 6. Zarządzanie stanem
Stan zarządzany przez custom hook useFlashcardsState w MyCardsPage. Używa useState dla lokalnego stanu (filters, flashcards, stats, pagination) i useEffect do synchronizacji z URL. Dla złożonych operacji, custom hook useFilters synchronizuje query params. Integracja z React Query dla cache API calls.

## 7. Integracja API
Integracja z GET /api/flashcards: Żądanie z query params (page, page_size, search, source_type, sort), odpowiedź FlashcardListResponseDTO. POST /api/flashcards: Body FlashcardCreateCommand, odpowiedź FlashcardDTO. PATCH /api/flashcards/{id}: Body FlashcardUpdateCommand, odpowiedź FlashcardDTO. DELETE /api/flashcards/{id}: 204 No Content.

## 8. Interakcje użytkownika
- Wyszukiwanie: Input z debouncing → update filters → refetch API.
- Filtrowanie: Dropdown → update URL → refetch.
- Dodanie: Klik przycisk → modal → submit → add to list, toast success.
- Edycja: Klik edit → inline form → submit → update, toast.
- Usuwanie: Klik delete → modal → confirm → remove, toast.
- Paginacja: Klik strona → update URL → refetch.

## 9. Warunki i walidacja
- Page: min 1, sprawdzane w Pagination.
- Page_size: 10/20/50/100, walidacja w FiltersPanel.
- Search: min 1 char, debounced, walidacja w API.
- Teksty fiszek: max 500 chars, walidacja w formach z counters.

## 10. Obsługa błędów
- 401: Redirect to login, toast.
- 500: Toast z retry.
- Walidacja: Inline errors w textarea.
- Pusta lista: Placeholder z linkiem.
- Błędy API: Toast notifications.

## 11. Kroki implementacji
1. Utwórz stronę Astro /my-cards.
2. Zaimplementuj podstawowe komponenty (StatsPanel, FiltersPanel).
3. Dodaj FlashcardGrid i FlashcardCard z flip animacją.
4. Zintegruj API calls z useFlashcards hook.
5. Dodaj modale (Create, Delete) z walidacją.
6. Zaimplementuj paginację i deep linking.
7. Dodaj obsługę błędów i toasty.
