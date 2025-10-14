# Plan implementacji widoku Generowanie Fiszek AI

## 1. Przegląd

Widok **Generowanie Fiszek AI** (`/generate`) umożliwia użytkownikowi szybkie tworzenie fiszek edukacyjnych przy pomocy sztucznej inteligencji. Użytkownik wkleja tekst źródłowy (1000-32768 znaków), system generuje propozycje fiszek przez API, a następnie użytkownik może je przeglądać, edytować, akceptować lub odrzucać przed zapisem do swojej biblioteki. Widok wspiera walidację w czasie rzeczywistym, obsługę błędów, dostępność (ARIA, keyboard navigation) oraz zabezpieczenia (XSS prevention, CSRF protection).

## 2. Routing widoku

**Ścieżka:** `/generate`

**Typ strony:** Astro page z osadzonym interaktywnym komponentem React

**Struktura plików:**
- `/src/pages/generate.astro` - główna strona Astro
- `/src/components/generate/GenerateContainer.tsx` - główny kontener React (client:load)

**Przekierowania:**
- Niezalogowany użytkownik → redirect do `/login` (middleware)
- Po pomyślnym zapisie fiszek → redirect do `/my-cards` lub wyczyszczenie formularza (do decyzji UX)

## 3. Struktura komponentów

```
generate.astro (Astro page)
└── Layout (Astro)
    └── GenerateContainer.tsx (React client:load)
        ├── GenerateForm.tsx
        │   ├── Textarea (Shadcn/ui)
        │   ├── CharacterCounter.tsx
        │   ├── ValidationMessage.tsx
        │   └── Button "Generuj fiszki" (Shadcn/ui)
        │
        ├── LoadingState.tsx (conditional)
        │   ├── Spinner (Shadcn/ui)
        │   └── LoadingMessage
        │
        ├── ErrorState.tsx (conditional)
        │   ├── ErrorIcon
        │   ├── ErrorMessage
        │   └── RetryButton (Shadcn/ui)
        │
        └── ProposalsSection.tsx (conditional)
            ├── ProposalsHeader.tsx
            │   ├── GroupActions (Zaznacz/Odznacz wszystkie)
            │   └── AcceptedCounter ("Zaakceptowano: X/Y")
            │
            ├── ProposalsList.tsx
            │   └── ProposalCard.tsx[] (dla każdej propozycji)
            │       ├── Card (Shadcn/ui)
            │       ├── Checkbox (Shadcn/ui)
            │       ├── ProposalContent.tsx (front/back preview)
            │       ├── ProposalActions.tsx (edytuj, odrzuć)
            │       ├── Badge "Edytowano" (Shadcn/ui, conditional)
            │       └── ProposalEditor.tsx (conditional, inline edit mode)
            │           ├── Textarea front (Shadcn/ui)
            │           ├── Textarea back (Shadcn/ui)
            │           ├── CharacterCounter.tsx (x2)
            │           └── EditorActions (Zapisz, Anuluj)
            │
            └── SaveButton.tsx
                └── Button "Zapisz fiszki (X)" (Shadcn/ui)
```

## 4. Szczegóły komponentów

### 4.1. GenerateContainer.tsx

**Opis:** Główny kontener zarządzający stanem całego widoku generowania. Orkiestruje przepływ od wprowadzenia tekstu, przez generowanie, przegląd propozycji, aż po zapis fiszek.

**Główne elementy:**
- Warunkowe renderowanie sekcji (formularz, loading, error, propozycje) w zależności od stanu
- Logika obsługi beforeunload (potwierdzenie przed opuszczeniem strony)
- Integracja z custom hookiem `useGenerateFlashcards`

**Obsługiwane interakcje:**
- Zarządzanie przepływem między stanami: idle → loading → proposals/error
- Obsługa keyboard shortcuts (Ctrl+Enter → generuj)
- Obsługa window.beforeunload gdy są niezapisane propozycje

**Warunki walidacji:**
- Brak (delegowane do komponentów dzieci)

**Typy:**
- `GenerateViewState` (ViewModel)
- `AiGenerationSessionDTO` (z types.ts)
- `ProposalViewModel` (ViewModel)

**Propsy:**
- Brak (główny kontener)

---

### 4.2. GenerateForm.tsx

**Opis:** Formularz z textarea do wklejania tekstu źródłowego oraz przyciskiem generowania. Obsługuje walidację długości tekstu w czasie rzeczywistym i wyświetla komunikaty walidacyjne.

**Główne elementy:**
- `<form>` element semantyczny
- `<label>` dla textarea: "Wklej tekst do wygenerowania fiszek"
- `<Textarea>` (Shadcn/ui) z ref dla autofocus
- `<CharacterCounter>` wyświetlający aktualną długość i limit
- `<ValidationMessage>` pokazujący błędy walidacji
- `<Button>` "Generuj fiszki" (disabled gdy walidacja nie przechodzi lub isLoading)

**Obsługiwane interakcje:**
- onChange textarea → aktualizacja stanu inputText
- onSubmit form → walidacja → wywołanie handleGenerate
- Keyboard: Ctrl+Enter → submit formularza
- Autofocus na textarea przy montowaniu komponentu

**Warunki walidacji:**
- `inputText.length >= 1000` - minimum 1000 znaków
- `inputText.length <= 32768` - maksimum 32768 znaków
- Komunikaty:
  - Poniżej 1000: "Tekst musi mieć minimum 1000 znaków (obecnie: {count})"
  - Powyżej 32768: "Przekroczono limit 32768 znaków (obecnie: {count})"

**Typy:**
- `GenerateFormProps` (interfejs komponentu)
- `GenerateFormData` (ViewModel)

**Propsy:**
```typescript
interface GenerateFormProps {
  onGenerate: (inputText: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
```

---

### 4.3. CharacterCounter.tsx

**Opis:** Licznik znaków z live update, pokazujący aktualną długość tekstu względem limitu.

**Główne elementy:**
- `<div>` z aria-live="polite" dla screen readers
- Tekst: "{currentCount} / {maxCount} znaków"
- Kolory: zielony (valid), pomarańczowy (poniżej min), czerwony (powyżej max)

**Obsługiwane interakcje:**
- Brak (tylko wyświetlanie)

**Warunki walidacji:**
- Brak (tylko wizualizacja stanu)

**Typy:**
- `CharacterCounterProps` (interfejs komponentu)

**Propsy:**
```typescript
interface CharacterCounterProps {
  current: number;
  min?: number;
  max: number;
  className?: string;
}
```

---

### 4.4. ValidationMessage.tsx

**Opis:** Komponent wyświetlający komunikaty walidacyjne inline pod polem formularza.

**Główne elementy:**
- `<p>` z odpowiednim id dla aria-describedby
- Ikona błędu (opcjonalnie)
- Tekst komunikatu w kolorze czerwonym

**Obsługiwane interakcje:**
- Brak (tylko wyświetlanie)

**Warunki walidacji:**
- Renderuje tylko gdy `message` nie jest null/undefined

**Typy:**
- `ValidationMessageProps` (interfejs komponentu)

**Propsy:**
```typescript
interface ValidationMessageProps {
  message: string | null;
  id?: string;
  className?: string;
}
```

---

### 4.5. LoadingState.tsx

**Opis:** Stan ładowania wyświetlany podczas generowania propozycji przez AI. Centralny spinner z komunikatem informacyjnym.

**Główne elementy:**
- `<div>` centrujący (flexbox)
- `<Spinner>` komponent (z Shadcn/ui lub custom)
- `<p>` komunikat: "Generuję fiszki... To może potrwać do 30 sekund"
- role="status" aria-live="polite" dla screen readers

**Obsługiwane interakcje:**
- Brak (tylko wyświetlanie)

**Warunki walidacji:**
- Brak

**Typy:**
- Brak (prosty komponent prezentacyjny)

**Propsy:**
- Brak lub opcjonalny `message: string`

---

### 4.6. ErrorState.tsx

**Opis:** Stan błędu z komunikatem i opcjonalnym przyciskiem retry. Wyświetlany gdy generowanie się nie powiedzie.

**Główne elementy:**
- `<div>` kontener z ikoną błędu
- `<h3>` tytuł błędu
- `<p>` komunikat błędu
- `<Button>` "Spróbuj ponownie" (conditional, dla błędów 429, 502)
- Countdown timer dla 429 (rate limit)

**Obsługiwane interakcje:**
- onClick retry button → wywołanie handleRetry

**Warunki walidacji:**
- Brak

**Typy:**
- `ErrorStateProps` (interfejs komponentu)
- `ApiError` (ViewModel)

**Propsy:**
```typescript
interface ErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
}

interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number; // sekundy dla 429
}
```

---

### 4.7. ProposalsSection.tsx

**Opis:** Sekcja wyświetlająca listę propozycji AI z nagłówkiem, licznikiem i przyciskiem zapisu.

**Główne elementy:**
- `<section>` semantyczny
- `<ProposalsHeader>` z akcjami grupowymi i licznikiem
- `<ProposalsList>` lista kart propozycji
- `<SaveButton>` przycisk zapisu fiszek

**Obsługiwane interakcje:**
- Delegowane do komponentów dzieci

**Warunki walidacji:**
- Brak (delegowane do komponentów dzieci)

**Typy:**
- `ProposalsSectionProps` (interfejs komponentu)

**Propsy:**
```typescript
interface ProposalsSectionProps {
  proposals: ProposalViewModel[];
  sessionId: string;
  onSave: () => Promise<void>;
}
```

---

### 4.8. ProposalsHeader.tsx

**Opis:** Nagłówek sekcji propozycji z akcjami grupowymi i licznikiem zaakceptowanych.

**Główne elementy:**
- `<div>` flex container
- `<div>` grupa przycisków: "Zaznacz wszystkie", "Odznacz wszystkie"
- `<AcceptedCounter>` komponent licznika

**Obsługiwane interakcje:**
- onClick "Zaznacz wszystkie" → handleSelectAll()
- onClick "Odznacz wszystkie" → handleDeselectAll()

**Warunki walidacji:**
- Brak

**Typy:**
- `ProposalsHeaderProps` (interfejs komponentu)

**Propsy:**
```typescript
interface ProposalsHeaderProps {
  acceptedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}
```

---

### 4.9. AcceptedCounter.tsx

**Opis:** Licznik pokazujący ilość zaakceptowanych propozycji.

**Główne elementy:**
- `<p>` lub `<span>` z tekstem: "Zaakceptowano: {accepted}/{total}"
- aria-live="polite" dla aktualizacji dynamicznych

**Obsługiwane interakcje:**
- Brak (tylko wyświetlanie)

**Warunki walidacji:**
- Brak

**Typy:**
- `AcceptedCounterProps` (interfejs komponentu)

**Propsy:**
```typescript
interface AcceptedCounterProps {
  accepted: number;
  total: number;
}
```

---

### 4.10. ProposalsList.tsx

**Opis:** Lista kart propozycji AI. Mapuje propozycje do komponentów ProposalCard.

**Główne elementy:**
- `<div>` grid container (responsive: 1 kolumna mobile, 2 tablet, 3 desktop)
- Array.map() → `<ProposalCard>` dla każdej propozycji
- role="region" aria-label="Lista propozycji fiszek"

**Obsługiwane interakcje:**
- Delegowane do ProposalCard

**Warunki walidacji:**
- Brak

**Typy:**
- `ProposalsListProps` (interfejs komponentu)

**Propsy:**
```typescript
interface ProposalsListProps {
  proposals: ProposalViewModel[];
  onCheck: (id: string) => void;
  onEdit: (id: string, data: { front: string; back: string }) => void;
  onReject: (id: string) => void;
}
```

---

### 4.11. ProposalCard.tsx

**Opis:** Karta pojedynczej propozycji fiszki z możliwością akceptacji, edycji i odrzucenia. Obsługuje inline editing mode.

**Główne elementy:**
- `<Card>` (Shadcn/ui) z conditional border color (fioletowy dla edytowanych)
- **Normal mode:**
  - `<Checkbox>` (Shadcn/ui) "Zaakceptuj"
  - `<ProposalContent>` front_text i back_text
  - `<Badge>` "Edytowano" (conditional, gdy isEdited)
  - `<ProposalActions>` przyciski Edytuj, Odrzuć
- **Edit mode:**
  - `<ProposalEditor>` inline form z textarea dla front i back

**Obsługiwane interakcje:**
- onChange checkbox → onCheck(proposal.temporary_id)
- onClick "Edytuj" → toggle editMode (true)
- onClick "Odrzuć" → onReject(proposal.temporary_id) → karta znika
- W edit mode: zapis → onEdit(), anuluj → toggle editMode (false)
- Keyboard: ESC → zamknij edit mode

**Warunki walidacji:**
- W edit mode: front_text i back_text max 500 znaków każdy
- Komunikaty inline pod textarea jeśli przekroczono limit

**Typy:**
- `ProposalCardProps` (interfejs komponentu)
- `ProposalViewModel` (ViewModel)

**Propsy:**
```typescript
interface ProposalCardProps {
  proposal: ProposalViewModel;
  onCheck: (id: string) => void;
  onEdit: (id: string, data: { front: string; back: string }) => void;
  onReject: (id: string) => void;
}
```

---

### 4.12. ProposalContent.tsx

**Opis:** Wyświetlanie frontu i tyłu propozycji fiszki (preview mode, nie edycja).

**Główne elementy:**
- `<div>` kontener
- `<div>` front_text z etykietą "Przód:"
- `<div>` back_text z etykietą "Tył:"
- Sanityzacja treści przed wyświetleniem (DOMPurify)

**Obsługiwane interakcje:**
- Brak (tylko wyświetlanie)

**Warunki walidacji:**
- Brak

**Typy:**
- `ProposalContentProps` (interfejs komponentu)

**Propsy:**
```typescript
interface ProposalContentProps {
  frontText: string;
  backText: string;
}
```

---

### 4.13. ProposalActions.tsx

**Opis:** Grupa przycisków akcji dla propozycji (Edytuj, Odrzuć).

**Główne elementy:**
- `<div>` flex container
- `<Button>` "Edytuj" (variant: outline)
- `<Button>` "Odrzuć" (variant: destructive)

**Obsługiwane interakcje:**
- onClick "Edytuj" → onEdit()
- onClick "Odrzuć" → onReject()

**Warunki walidacji:**
- Brak

**Typy:**
- `ProposalActionsProps` (interfejs komponentu)

**Propsy:**
```typescript
interface ProposalActionsProps {
  onEdit: () => void;
  onReject: () => void;
}
```

---

### 4.14. ProposalEditor.tsx

**Opis:** Inline edytor propozycji z textarea dla frontu i tyłu, character counters i przyciskami zapisu/anulowania.

**Główne elementy:**
- `<div>` kontener z focus trap
- `<Textarea>` dla front_text z character counter
- `<Textarea>` dla back_text z character counter
- `<ValidationMessage>` dla błędów walidacji
- `<div>` grupa przycisków: "Zapisz", "Anuluj"

**Obsługiwane interakcje:**
- onChange textarea → aktualizacja lokalnego stanu
- onClick "Zapisz" → walidacja → onSave({ front, back })
- onClick "Anuluj" lub ESC → onCancel()
- Focus trap: focus pozostaje w edytorze do zamknięcia

**Warunki walidacji:**
- front_text: 1-500 znaków
- back_text: 1-500 znaków
- Komunikaty:
  - Puste pole: "Pole nie może być puste"
  - Przekroczony limit: "Przekroczono limit 500 znaków (obecnie: {count})"

**Typy:**
- `ProposalEditorProps` (interfejs komponentu)
- `ProposalEditorData` (ViewModel)

**Propsy:**
```typescript
interface ProposalEditorProps {
  initialFront: string;
  initialBack: string;
  onSave: (data: { front: string; back: string }) => void;
  onCancel: () => void;
}
```

---

### 4.15. SaveButton.tsx

**Opis:** Główny przycisk zapisu zaakceptowanych fiszek.

**Główne elementy:**
- `<Button>` (Shadcn/ui) "Zapisz fiszki ({count})"
- Disabled gdy count === 0 lub isLoading
- Loading spinner podczas zapisu

**Obsługiwane interakcje:**
- onClick → onSave()

**Warunki walidacji:**
- Aktywny tylko gdy acceptedCount > 0

**Typy:**
- `SaveButtonProps` (interfejs komponentu)

**Propsy:**
```typescript
interface SaveButtonProps {
  acceptedCount: number;
  onSave: () => Promise<void>;
  isLoading: boolean;
}
```

---

## 5. Typy

### 5.1. Typy z types.ts (już istniejące)

**Wykorzystywane bezpośrednio:**
- `AiGenerationSessionCreateCommand` - request do POST /api/ai-generation/sessions
- `AiGenerationSessionDTO` - metadane sesji z response
- `AiGenerationProposalDTO` - pojedyncza propozycja z API
- `FlashcardBatchSaveCommand` - request do POST /api/flashcards/batch
- `FlashcardBatchSaveCardCommand` - pojedyncza fiszka w batch save
- `ErrorResponseDTO` - standardowy format błędu

### 5.2. Nowe ViewModels (do stworzenia)

```typescript
// src/components/generate/types.ts

import type {
  AiGenerationSessionDTO,
  AiGenerationProposalDTO,
  ErrorResponseDTO,
} from "../../types";

/**
 * Stan widoku generowania
 */
export type GenerateViewState = "idle" | "loading" | "proposals" | "error" | "saving";

/**
 * ViewModel dla propozycji z dodatkowymi stanami UI
 */
export interface ProposalViewModel extends AiGenerationProposalDTO {
  isAccepted: boolean;
  isEdited: boolean;
  isEditMode: boolean;
  originalFront?: string;
  originalBack?: string;
}

/**
 * Dane formularza generowania
 */
export interface GenerateFormData {
  inputText: string;
}

/**
 * Stan błędu API z dodatkowymi informacjami dla UI
 */
export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number; // sekundy dla rate limit
  details?: Record<string, string>;
}

/**
 * Dane do zapisu propozycji (edycja inline)
 */
export interface ProposalEditorData {
  front: string;
  back: string;
}

/**
 * Konfiguracja walidacji długości tekstu
 */
export interface TextLengthValidation {
  min: number;
  max: number;
  current: number;
  isValid: boolean;
  errorMessage: string | null;
}

/**
 * Stan całego widoku generowania (dla custom hook)
 */
export interface GenerateState {
  viewState: GenerateViewState;
  inputText: string;
  session: AiGenerationSessionDTO | null;
  proposals: ProposalViewModel[];
  error: ApiError | null;
  acceptedCount: number;
  rejectedCount: number;
}
```

### 5.3. Utility types

```typescript
/**
 * Mapowanie kodu błędu HTTP na ApiError
 */
export function createApiError(errorResponse: ErrorResponseDTO, status: number): ApiError {
  const { error } = errorResponse;
  
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    retryable: [429, 502, 503].includes(status),
    retryAfter: status === 429 ? parseRetryAfter(error.details) : undefined,
  };
}

/**
 * Walidacja długości tekstu
 */
export function validateTextLength(
  text: string,
  min: number,
  max: number
): TextLengthValidation {
  const current = text.length;
  const isValid = current >= min && current <= max;
  
  let errorMessage: string | null = null;
  if (current < min) {
    errorMessage = `Tekst musi mieć minimum ${min} znaków (obecnie: ${current})`;
  } else if (current > max) {
    errorMessage = `Przekroczono limit ${max} znaków (obecnie: ${current})`;
  }
  
  return { min, max, current, isValid, errorMessage };
}

/**
 * Konwersja ProposalViewModel do FlashcardBatchSaveCardCommand
 */
export function proposalToSaveCommand(
  proposal: ProposalViewModel
): FlashcardBatchSaveCardCommand {
  return {
    front_text: proposal.front_text,
    back_text: proposal.back_text,
    origin_status: proposal.isEdited ? "AI_EDITED" : "AI_ORIGINAL",
  };
}
```

---

## 6. Zarządzanie stanem

### 6.1. Custom Hook: useGenerateFlashcards

**Lokalizacja:** `/src/components/generate/hooks/useGenerateFlashcards.ts`

**Odpowiedzialność:**
- Zarządzanie całym stanem widoku generowania
- Wywołania API (POST sessions, POST batch)
- Transformacja danych (DTO → ViewModel)
- Obsługa błędów i stanów ładowania

**Stan wewnętrzny:**
```typescript
const [state, setState] = useState<GenerateState>({
  viewState: "idle",
  inputText: "",
  session: null,
  proposals: [],
  error: null,
  acceptedCount: 0,
  rejectedCount: 0,
});
```

**Funkcje eksportowane:**
```typescript
interface UseGenerateFlashcardsReturn {
  // Stan
  viewState: GenerateViewState;
  inputText: string;
  proposals: ProposalViewModel[];
  error: ApiError | null;
  acceptedCount: number;
  rejectedCount: number;
  
  // Akcje
  setInputText: (text: string) => void;
  generateProposals: () => Promise<void>;
  toggleProposalAccepted: (id: string) => void;
  editProposal: (id: string, data: ProposalEditorData) => void;
  rejectProposal: (id: string) => void;
  selectAllProposals: () => void;
  deselectAllProposals: () => void;
  saveFlashcards: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  
  // Computed values
  hasUnsavedProposals: boolean;
  canSave: boolean;
}
```

**Implementacja kluczowych funkcji:**

```typescript
// Generowanie propozycji
const generateProposals = async () => {
  setState(prev => ({ ...prev, viewState: "loading", error: null }));
  
  try {
    const command: AiGenerationSessionCreateCommand = {
      input_text: state.inputText,
      model_identifier: null,
      client_request_id: null,
    };
    
    const response = await fetch("/api/ai-generation/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    
    if (!response.ok) {
      const errorData: ErrorResponseDTO = await response.json();
      throw createApiError(errorData, response.status);
    }
    
    const data: AiGenerationSessionCreateResponseDTO = await response.json();
    
    const proposalViewModels: ProposalViewModel[] = data.proposals.map(p => ({
      ...p,
      isAccepted: false,
      isEdited: false,
      isEditMode: false,
    }));
    
    setState(prev => ({
      ...prev,
      viewState: "proposals",
      session: data.session,
      proposals: proposalViewModels,
      acceptedCount: 0,
      rejectedCount: 0,
    }));
  } catch (error) {
    setState(prev => ({
      ...prev,
      viewState: "error",
      error: error as ApiError,
    }));
  }
};

// Edycja propozycji
const editProposal = (id: string, data: ProposalEditorData) => {
  setState(prev => ({
    ...prev,
    proposals: prev.proposals.map(p =>
      p.temporary_id === id
        ? {
            ...p,
            front_text: data.front,
            back_text: data.back,
            isEdited: true,
            isAccepted: true, // auto-accept po edycji
            isEditMode: false,
            originalFront: p.originalFront || p.front_text,
            originalBack: p.originalBack || p.back_text,
          }
        : p
    ),
    acceptedCount: prev.proposals.filter(p =>
      p.temporary_id === id ? true : p.isAccepted
    ).length,
  }));
};

// Zapis fiszek
const saveFlashcards = async () => {
  if (!state.session) return;
  
  setState(prev => ({ ...prev, viewState: "saving" }));
  
  try {
    const acceptedProposals = state.proposals.filter(p => p.isAccepted);
    
    const command: FlashcardBatchSaveCommand = {
      ai_generation_audit_id: state.session.id,
      cards: acceptedProposals.map(proposalToSaveCommand) as [
        FlashcardBatchSaveCardCommand,
        ...FlashcardBatchSaveCardCommand[]
      ],
      rejected_count: state.rejectedCount,
    };
    
    const response = await fetch("/api/flashcards/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    
    if (!response.ok) {
      const errorData: ErrorResponseDTO = await response.json();
      throw createApiError(errorData, response.status);
    }
    
    // Sukces - toast i redirect
    toast.success(`Zapisano ${acceptedProposals.length} fiszek`);
    window.location.href = "/my-cards";
  } catch (error) {
    setState(prev => ({
      ...prev,
      viewState: "proposals",
      error: error as ApiError,
    }));
    toast.error("Nie udało się zapisać fiszek");
  }
};
```

### 6.2. Lokalny stan komponentów

**ProposalCard:**
- `editMode: boolean` - czy w trybie edycji
- `editData: ProposalEditorData` - tymczasowe dane podczas edycji

**ProposalEditor:**
- `frontText: string` - lokalna wartość front podczas edycji
- `backText: string` - lokalna wartość back podczas edycji
- `errors: { front?: string; back?: string }` - błędy walidacji

**GenerateForm:**
- Cały stan delegowany do hooka `useGenerateFlashcards`

### 6.3. SessionStorage (recovery)

**Opcjonalna feature:** Zapis propozycji do sessionStorage dla recovery.

```typescript
// Zapis po otrzymaniu propozycji
useEffect(() => {
  if (state.session && state.proposals.length > 0) {
    sessionStorage.setItem(
      `ai-proposals-${state.session.id}`,
      JSON.stringify({
        session: state.session,
        proposals: state.proposals,
        timestamp: Date.now(),
      })
    );
  }
}, [state.session, state.proposals]);

// Próba odzyskania przy montowaniu
useEffect(() => {
  const recoveryKey = Object.keys(sessionStorage)
    .find(key => key.startsWith("ai-proposals-"));
  
  if (recoveryKey) {
    const data = JSON.parse(sessionStorage.getItem(recoveryKey)!);
    // Sprawdź czy nie starsze niż 1h
    if (Date.now() - data.timestamp < 3600000) {
      // Zaproponuj użytkownikowi przywrócenie
      // ... UI dla recovery
    }
  }
}, []);
```

---

## 7. Integracja API

### 7.1. POST /api/ai-generation/sessions

**Cel:** Generowanie propozycji fiszek z tekstu źródłowego

**Request:**
```typescript
// Typ: AiGenerationSessionCreateCommand
{
  input_text: string; // 1000-32768 znaków
  model_identifier?: string | null;
  client_request_id?: string | null;
}
```

**Response (201 Created):**
```typescript
// Typ: AiGenerationSessionCreateResponseDTO
{
  session: {
    id: string; // UUID
    client_request_id: string; // UUID
    model_identifier: string;
    generation_started_at: string; // ISO datetime
  },
  proposals: [
    {
      temporary_id: string; // UUID
      front_text: string;
      back_text: string;
    }
    // ... do 20 propozycji
  ]
}
```

**Error Responses:**
- **400 Bad Request:** Walidacja długości tekstu
  ```json
  {
    "error": {
      "code": "INVALID_INPUT",
      "message": "Input text must be at least 1000 characters",
      "details": { "input_text": "Input text must be at least 1000 characters" }
    }
  }
  ```

- **409 Conflict:** Duplikat client_request_id
  ```json
  {
    "error": {
      "code": "DUPLICATE_REQUEST_ID",
      "message": "A session with this client_request_id already exists"
    }
  }
  ```

- **422 Unprocessable Entity:** Nieprawidłowy JSON
  ```json
  {
    "error": {
      "code": "INVALID_JSON",
      "message": "Unable to parse request body"
    }
  }
  ```

- **429 Too Many Requests:** Rate limiting
  ```json
  {
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Too many requests, try again in 60 seconds",
      "details": { "retry_after": "60" }
    }
  }
  ```

- **502 Bad Gateway:** Błąd OpenRouter
  ```json
  {
    "error": {
      "code": "AI_SERVICE_ERROR",
      "message": "AI service temporarily unavailable"
    }
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "An unexpected error occurred"
    }
  }
  ```

**Wykorzystanie w komponencie:**
```typescript
const generateProposals = async () => {
  const response = await fetch("/api/ai-generation/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input_text: inputText,
      model_identifier: null,
      client_request_id: null,
    }),
  });
  
  if (!response.ok) {
    const error: ErrorResponseDTO = await response.json();
    // Obsługa błędu...
  }
  
  const data: AiGenerationSessionCreateResponseDTO = await response.json();
  // Przetworzenie propozycji...
};
```

---

### 7.2. POST /api/flashcards/batch

**Cel:** Zapis zaakceptowanych propozycji jako fiszek

**Request:**
```typescript
// Typ: FlashcardBatchSaveCommand
{
  ai_generation_audit_id: string; // UUID z session.id
  cards: [ // min 1 element
    {
      front_text: string; // 1-500 znaków
      back_text: string; // 1-500 znaków
      origin_status: "AI_ORIGINAL" | "AI_EDITED";
    }
  ],
  rejected_count: number; // liczba odrzuconych propozycji
}
```

**Response (200 OK):**
```typescript
// Typ: FlashcardBatchSaveResponseDTO
{
  saved_card_ids: string[]; // UUID[]
  audit: {
    id: string;
    generated_count: number;
    saved_unchanged_count: number;
    saved_edited_count: number;
    rejected_count: number;
    generation_completed_at: string; // ISO datetime
  }
}
```

**Error Responses:**
- **400 Bad Request:** Pusta lista lub walidacja
  ```json
  {
    "error": {
      "code": "INVALID_INPUT",
      "message": "Cards array cannot be empty"
    }
  }
  ```

- **401 Unauthorized:** Brak autoryzacji
- **404 Not Found:** Brak sesji o podanym ID
- **409 Conflict:** Sesja już rozliczona
- **422 Unprocessable Entity:** Nieprawidłowe dane
- **500 Internal Server Error**

**Wykorzystanie w komponencie:**
```typescript
const saveFlashcards = async () => {
  const acceptedProposals = proposals.filter(p => p.isAccepted);
  
  const response = await fetch("/api/flashcards/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ai_generation_audit_id: session.id,
      cards: acceptedProposals.map(p => ({
        front_text: p.front_text,
        back_text: p.back_text,
        origin_status: p.isEdited ? "AI_EDITED" : "AI_ORIGINAL",
      })),
      rejected_count: rejectedCount,
    }),
  });
  
  if (!response.ok) {
    // Obsługa błędu...
  }
  
  const data: FlashcardBatchSaveResponseDTO = await response.json();
  // Sukces - redirect lub toast
};
```

---

## 8. Interakcje użytkownika

### 8.1. Wprowadzanie tekstu źródłowego

**Przepływ:**
1. Użytkownik wchodzi na `/generate` → autofocus na textarea
2. Wkleja lub wpisuje tekst → live update character counter
3. Real-time walidacja:
   - < 1000 znaków → komunikat błędu, przycisk disabled
   - 1000-32768 znaków → przycisk "Generuj fiszki" aktywny
   - > 32768 znaków → komunikat błędu, przycisk disabled

**Keyboard shortcuts:**
- `Ctrl+Enter` lub `Cmd+Enter` → submit formularza (generuj)

---

### 8.2. Generowanie propozycji

**Przepływ:**
1. Użytkownik klika "Generuj fiszki" lub Ctrl+Enter
2. Walidacja po stronie klienta (długość tekstu)
3. Wywołanie POST /api/ai-generation/sessions
4. UI zmienia się na loading state:
   - Spinner centralny
   - Komunikat "Generuję fiszki... To może potrwać do 30 sekund"
   - Przycisk disabled z tekstem "Generowanie..."
5. Sukces → wyświetlenie sekcji propozycji
6. Błąd → wyświetlenie error state z retry button (jeśli retryable)

---

### 8.3. Przegląd i akceptacja propozycji

**Przepływ:**
1. Propozycje wyświetlone w grid (responsive)
2. Dla każdej propozycji:
   - Checkbox "Zaakceptuj" (unchecked domyślnie)
   - Preview front i back text
   - Przyciski: "Edytuj", "Odrzuć"
3. Użytkownik zaznacza checkbox → isAccepted = true, licznik aktualizuje się
4. Użytkownik odznacza checkbox → isAccepted = false, licznik aktualizuje się

**Akcje grupowe:**
- "Zaznacz wszystkie" → wszystkie checkboxy checked
- "Odznacz wszystkie" → wszystkie checkboxy unchecked

**ARIA:**
- Checkbox: `aria-label="Zaakceptuj propozycję {numer}"`
- Licznik: `aria-live="polite"` dla dynamicznych aktualizacji

---

### 8.4. Edycja propozycji

**Przepływ:**
1. Użytkownik klika "Edytuj" na karcie propozycji
2. Karta zamienia się w inline form:
   - Textarea front (z aktualnym tekstem)
   - Textarea back (z aktualnym tekstem)
   - Character counters (X / 500)
   - Przyciski: "Zapisz", "Anuluj"
3. Focus trap aktywny (focus pozostaje w edytorze)
4. Użytkownik modyfikuje tekst → live update counters
5. Walidacja:
   - Puste pole → błąd "Pole nie może być puste"
   - > 500 znaków → błąd "Przekroczono limit 500 znaków"
6. Klik "Zapisz" (lub Enter):
   - Walidacja pass → zapisanie zmian
   - Karta wraca do preview mode
   - Badge "Edytowano" pojawia się
   - Border zmienia kolor na fioletowy
   - Checkbox auto-checked (isAccepted = true)
   - Licznik aktualizuje się
7. Klik "Anuluj" (lub ESC):
   - Karta wraca do preview mode bez zmian
   - Focus wraca na przycisk "Edytuj"

**Keyboard shortcuts:**
- `ESC` → anuluj edycję

---

### 8.5. Odrzucanie propozycji

**Przepływ:**
1. Użytkownik klika "Odrzuć" na karcie propozycji
2. Karta znika z listy (animacja fade-out opcjonalnie)
3. Licznik odrzuceń++ (wewnętrznie, dla API)
4. Licznik "Zaakceptowano: X/Y" aktualizuje Y (total maleje)
5. Jeśli Y osiągnie 0 → komunikat "Wszystkie propozycje odrzucone"

---

### 8.6. Zapis fiszek

**Przepływ:**
1. Użytkownik ma zaakceptowane propozycje (acceptedCount > 0)
2. Przycisk "Zapisz fiszki (X)" aktywny
3. Klik → wywołanie POST /api/flashcards/batch
4. UI:
   - Przycisk disabled z spinnerem
   - Komunikat loading (opcjonalnie)
5. Sukces:
   - Toast "Zapisano X fiszek"
   - Redirect do `/my-cards` LUB
   - Wyczyszczenie formularza do nowej sesji (do decyzji)
6. Błąd:
   - Toast z komunikatem błędu
   - Propozycje pozostają na ekranie
   - Możliwość ponowienia zapisu

---

### 8.7. Opuszczenie strony z niezapisanymi propozycjami

**Przepływ:**
1. Użytkownik ma propozycje na ekranie (viewState === "proposals")
2. Próbuje zamknąć kartę, wyjść ze strony lub kliknąć link nawigacji
3. window.beforeunload event:
   - Wyświetla potwierdzenie przeglądarki
   - "Masz niezapisane propozycje. Czy na pewno chcesz opuścić stronę?"
4. Użytkownik:
   - Anuluje → pozostaje na stronie
   - Potwierdza → opuszcza stronę (propozycje tracone, chyba że recovery z sessionStorage)

**Implementacja:**
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedProposals) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [hasUnsavedProposals]);
```

---

## 9. Warunki i walidacja

### 9.1. Walidacja długości tekstu wejściowego (GenerateForm)

**Warunki:**
- Minimum: 1000 znaków
- Maximum: 32768 znaków

**Komponenty dotknięte:**
- `GenerateForm` - walidacja przed submit
- `CharacterCounter` - wizualizacja stanu
- `ValidationMessage` - komunikaty błędów
- `Button "Generuj fiszki"` - disabled gdy invalid

**Wpływ na UI:**
```typescript
const validation = validateTextLength(inputText, 1000, 32768);

// CharacterCounter
<CharacterCounter 
  current={validation.current}
  min={validation.min}
  max={validation.max}
  className={validation.isValid ? "text-green-600" : "text-red-600"}
/>

// ValidationMessage
{!validation.isValid && (
  <ValidationMessage message={validation.errorMessage} />
)}

// Button
<Button disabled={!validation.isValid || isLoading}>
  Generuj fiszki
</Button>
```

---

### 9.2. Walidacja edycji propozycji (ProposalEditor)

**Warunki:**
- front_text: 1-500 znaków, nie może być pusty
- back_text: 1-500 znaków, nie może być pusty

**Komponenty dotknięte:**
- `ProposalEditor` - walidacja przed zapisem
- `CharacterCounter` (x2) - dla front i back
- `ValidationMessage` (x2) - komunikaty inline
- `Button "Zapisz"` - disabled gdy invalid

**Wpływ na UI:**
```typescript
const frontValidation = {
  isValid: frontText.length > 0 && frontText.length <= 500,
  error: frontText.length === 0 
    ? "Pole nie może być puste" 
    : frontText.length > 500 
      ? `Przekroczono limit 500 znaków (obecnie: ${frontText.length})`
      : null
};

// Textarea front
<div>
  <Textarea value={frontText} onChange={...} />
  <CharacterCounter current={frontText.length} max={500} />
  {frontValidation.error && (
    <ValidationMessage message={frontValidation.error} />
  )}
</div>

// Button Zapisz
<Button disabled={!frontValidation.isValid || !backValidation.isValid}>
  Zapisz
</Button>
```

---

### 9.3. Walidacja zapisu fiszek (SaveButton)

**Warunki:**
- Minimum 1 zaakceptowana propozycja (acceptedCount > 0)
- Sesja musi istnieć (session !== null)

**Komponenty dotknięte:**
- `SaveButton` - disabled gdy warunek nie spełniony
- `AcceptedCounter` - wizualizacja stanu

**Wpływ na UI:**
```typescript
const canSave = acceptedCount > 0 && session !== null && !isLoading;

<SaveButton 
  acceptedCount={acceptedCount}
  onSave={saveFlashcards}
  isLoading={isLoading}
  disabled={!canSave}
/>
```

**Komunikaty:**
- acceptedCount === 0: przycisk disabled, tekst "Zapisz fiszki (0)"
- acceptedCount > 0: przycisk aktywny, tekst "Zapisz fiszki ({count})"

---

### 9.4. Walidacja API responses

**Komponenty dotknięte:**
- `useGenerateFlashcards` hook - parsowanie i walidacja odpowiedzi
- `ErrorState` - wyświetlanie błędów

**Weryfikacje:**
1. **Status code:**
   - 2xx → sukces
   - 400, 422 → błąd walidacji (inline errors)
   - 401 → redirect do login
   - 409 → duplikat request (retry z nowym client_request_id)
   - 429 → rate limit (error state z countdown)
   - 502 → błąd AI service (error state z retry)
   - 500 → błąd systemowy (toast notification)

2. **Response body:**
   - Parsowanie JSON
   - Weryfikacja struktury (zod validation opcjonalnie)
   - Obsługa brakujących pól

3. **Business logic:**
   - proposals.length > 0 (jeśli 0 → komunikat "Brak propozycji")
   - session.id jest UUID
   - temporary_id każdej propozycji jest unikalny

**Przykład obsługi:**
```typescript
if (!response.ok) {
  const errorData: ErrorResponseDTO = await response.json();
  
  if (response.status === 400) {
    // Inline validation error
    setValidationError(errorData.error.message);
  } else if (response.status === 429) {
    // Rate limit
    setError(createApiError(errorData, 429));
  } else if (response.status === 502) {
    // AI service error
    setError(createApiError(errorData, 502));
  } else {
    // Generic error
    toast.error(errorData.error.message);
  }
  return;
}
```

---

## 10. Obsługa błędów

### 10.1. Błędy walidacji (400, 422)

**Źródło:** POST /api/ai-generation/sessions

**Obsługa:**
- Wyświetlenie inline pod textarea w `GenerateForm`
- Czerwony border na textarea
- aria-describedby łączy pole z komunikatem

**Przykład:**
```typescript
// Response 400
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Input text must be at least 1000 characters",
    "details": { "input_text": "..." }
  }
}

// UI
<div>
  <Textarea 
    aria-describedby="input-error"
    className="border-red-500"
  />
  <p id="input-error" className="text-red-600 text-sm mt-1">
    Input text must be at least 1000 characters
  </p>
</div>
```

---

### 10.2. Rate Limiting (429)

**Źródło:** POST /api/ai-generation/sessions

**Obsługa:**
- ErrorState z komunikatem "Zbyt wiele żądań"
- Countdown timer "Spróbuj za {X} sekund"
- Retry button disabled do końca countdown
- Po zakończeniu countdown → retry button aktywny

**Przykład:**
```typescript
// Response 429
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, try again in 60 seconds",
    "details": { "retry_after": "60" }
  }
}

// UI Component
const [countdown, setCountdown] = useState(retryAfter);

useEffect(() => {
  if (countdown > 0) {
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }
}, [countdown]);

<ErrorState>
  <p>Zbyt wiele żądań</p>
  <p>Spróbuj za {countdown} sekund</p>
  <Button disabled={countdown > 0} onClick={retry}>
    {countdown > 0 ? `Odczekaj (${countdown}s)` : "Spróbuj ponownie"}
  </Button>
</ErrorState>
```

---

### 10.3. Błąd AI Service (502)

**Źródło:** POST /api/ai-generation/sessions (OpenRouter down/error)

**Obsługa:**
- ErrorState z komunikatem "Błąd generowania fiszek"
- Retry button aktywny od razu
- Komunikat "Usługa AI tymczasowo niedostępna, spróbuj ponownie"

**Przykład:**
```typescript
<ErrorState
  error={{
    code: "AI_SERVICE_ERROR",
    message: "Usługa AI tymczasowo niedostępna",
    retryable: true,
  }}
  onRetry={generateProposals}
/>
```

---

### 10.4. Błąd systemowy (500)

**Źródło:** Dowolny endpoint

**Obsługa:**
- Toast notification (nie blokuje całego UI)
- Komunikat "Wystąpił błąd systemowy, spróbuj później"
- Opcja retry (jeśli aplikowalne)
- Propozycje/dane pozostają na ekranie (jeśli były)

**Przykład:**
```typescript
if (response.status === 500) {
  toast.error("Wystąpił błąd systemowy, spróbuj później");
  // UI nie zmienia się na error state, tylko pokazuje toast
}
```

---

### 10.5. Błąd duplikatu request (409)

**Źródło:** POST /api/ai-generation/sessions

**Obsługa:**
- Automatyczne ponowienie z nowym client_request_id
- Jeśli drugi raz fail → error state

**Przykład:**
```typescript
if (response.status === 409) {
  // Retry z nowym client_request_id
  const newClientRequestId = crypto.randomUUID();
  await generateProposals(inputText, newClientRequestId);
}
```

---

### 10.6. Błąd sesji (404, 409 przy save)

**Źródło:** POST /api/flashcards/batch

**Obsługa:**
- 404 (session not found) → error state "Sesja wygasła, wygeneruj fiszki ponownie"
- 409 (session already settled) → error state "Sesja już rozliczona"
- Brak możliwości retry, wymagane wygenerowanie nowych propozycji

**Przykład:**
```typescript
if (response.status === 404) {
  toast.error("Sesja wygasła, wygeneruj fiszki ponownie");
  reset(); // Wraca do formularza
}
```

---

### 10.7. Błąd sieciowy (network failure)

**Źródło:** fetch() throw

**Obsługa:**
- Toast "Brak połączenia z internetem"
- ErrorState z retry button
- Opcjonalnie: automatyczny retry po reconnect

**Przykład:**
```typescript
try {
  const response = await fetch(...);
} catch (error) {
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    toast.error("Brak połączenia z internetem");
    setError({
      code: "NETWORK_ERROR",
      message: "Brak połączenia z internetem",
      retryable: true,
    });
  }
}
```

---

### 10.8. Brak propozycji (edge case)

**Źródło:** API zwraca proposals = []

**Obsługa:**
- Empty state w sekcji propozycji
- Komunikat "Nie udało się wygenerować fiszek z podanego tekstu"
- Sugestia "Spróbuj z innym tekstem" + przycisk reset

**Przykład:**
```typescript
if (data.proposals.length === 0) {
  return (
    <EmptyState>
      <p>Nie udało się wygenerować fiszek z podanego tekstu</p>
      <p>Spróbuj z innym tekstem lub zmień parametry</p>
      <Button onClick={reset}>Wróć do formularza</Button>
    </EmptyState>
  );
}
```

---

### 10.9. Błąd walidacji przy zapisie (400 batch)

**Źródło:** POST /api/flashcards/batch

**Obsługa:**
- Toast z komunikatem błędu
- Propozycje pozostają na ekranie
- Highlight problematycznych kart (jeśli details zawiera info)

**Przykład:**
```typescript
// Response 400
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Card text exceeds 500 characters",
    "details": { "card_index": "3" }
  }
}

// UI - highlight karty 3
const cardIndex = parseInt(error.details?.card_index || "-1");
proposals[cardIndex].hasError = true;
```

---

## 11. Kroki implementacji

### Krok 1: Setup struktury projektu
1. Utworzyć katalog `/src/components/generate/`
2. Utworzyć plik `/src/pages/generate.astro`
3. Utworzyć plik `/src/components/generate/types.ts` z ViewModels
4. Utworzyć plik `/src/components/generate/utils.ts` z funkcjami pomocniczymi

### Krok 2: Implementacja custom hooka
1. Utworzyć `/src/components/generate/hooks/useGenerateFlashcards.ts`
2. Zaimplementować stan i podstawowe funkcje:
   - `setInputText`
   - `generateProposals`
   - `toggleProposalAccepted`
   - `saveFlashcards`
3. Dodać obsługę błędów i transformację danych
4. Dodać computed values (`hasUnsavedProposals`, `canSave`)

### Krok 3: Komponenty podstawowe
1. Utworzyć `CharacterCounter.tsx`
2. Utworzyć `ValidationMessage.tsx`
3. Utworzyć `LoadingState.tsx`
4. Utworzyć `ErrorState.tsx`
5. Przetestować każdy komponent w izolacji (Storybook opcjonalnie)

### Krok 4: Formularz generowania
1. Utworzyć `GenerateForm.tsx`
2. Połączyć z hookiem `useGenerateFlashcards`
3. Implementować walidację real-time
4. Dodać autofocus i keyboard shortcuts (Ctrl+Enter)
5. Przetestować walidację (< 1000, 1000-32768, > 32768)

### Krok 5: Komponenty propozycji - podstawa
1. Utworzyć `ProposalsSection.tsx`
2. Utworzyć `ProposalsHeader.tsx`
3. Utworzyć `AcceptedCounter.tsx`
4. Utworzyć `ProposalsList.tsx`
5. Połączyć z hookiem i przetestować renderowanie listy

### Krok 6: Karta propozycji
1. Utworzyć `ProposalCard.tsx`
2. Zaimplementować normal mode (checkbox, preview, akcje)
3. Dodać styling dla stanu edytowanego (border, badge)
4. Przetestować interakcje (check, reject)

### Krok 7: Edytor propozycji
1. Utworzyć `ProposalEditor.tsx`
2. Zaimplementować inline form (2x textarea + counters)
3. Dodać walidację (1-500 znaków)
4. Zaimplementować focus trap
5. Dodać keyboard shortcuts (ESC → anuluj)
6. Połączyć z `ProposalCard` (toggle edit mode)

### Krok 8: Akcje grupowe i zapis
1. Zaimplementować "Zaznacz wszystkie" / "Odznacz wszystkie"
2. Utworzyć `SaveButton.tsx`
3. Połączyć z hookiem `saveFlashcards`
4. Dodać stan loading podczas zapisu
5. Zaimplementować redirect po sukcesie lub reset

### Krok 9: Główny kontener
1. Utworzyć `GenerateContainer.tsx`
2. Połączyć wszystkie sekcje (form, loading, error, proposals)
3. Zaimplementować warunkowe renderowanie w zależności od `viewState`
4. Dodać beforeunload handler dla niezapisanych propozycji
5. Dodać global keyboard shortcuts

### Krok 10: Strona Astro
1. Utworzyć `/src/pages/generate.astro`
2. Zaimportować `Layout` i `GenerateContainer`
3. Osadzić kontener z `client:load`
4. Dodać meta tags (title, description)
5. Przetestować routing i rendering

### Krok 13: Dostępność (A11y)
1. Dodać wszystkie ARIA labels:
   - Textarea: "Wklej tekst do wygenerowania fiszek"
   - Checkbox: "Zaakceptuj propozycję {numer}"
   - Counter: aria-live="polite"
2. Zaimplementować focus management:
   - Autofocus na textarea przy montowaniu
   - Focus trap w ProposalEditor
   - Focus return po zamknięciu edytora
3. Przetestować keyboard navigation (Tab, Enter, ESC)
4. Uruchomić axe DevTools i naprawić issues
5. Przetestować ze screen readerem (NVDA/VoiceOver)


### Krok 17: Animacje i polish
1. Dodać transitions dla state changes (idle → loading → proposals)
2. Dodać fade-out animation dla odrzucanych kart
3. Dodać subtle animations dla checkbox check/uncheck
4. Dodać loading skeleton (opcjonalnie zamiast spinnera)