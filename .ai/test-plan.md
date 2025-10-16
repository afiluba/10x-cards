# Kompleksowy Plan Testów - 10x Cards

## 1. Wprowadzenie i cele testowania

### 1.1 Cel projektu testów
Celem niniejszego planu testów jest zapewnienie wysokiej jakości aplikacji 10x Cards poprzez systematyczne testowanie wszystkich kluczowych funkcjonalności, identyfikację potencjalnych ryzyk oraz minimalizację liczby błędów produkcyjnych. Projekt testów ma charakter proaktywny i skupia się na krytycznych ścieżkach użytkownika oraz obszarach wysokiego ryzyka.

### 1.2 Zakres projektu
Aplikacja 10x Cards to platforma do zarządzania fiszkami z funkcjami:
- Uwierzytelniania użytkowników
- Generowania fiszek przy pomocy AI
- Ręcznego tworzenia fiszek
- Zarządzania biblioteką fiszek
- Filtrowania i wyszukiwania

### 1.3 Kryteria sukcesu
- Minimum 85% pokrycia kodu testami automatycznymi
- Zero krytycznych błędów bezpieczeństwa w środowisku produkcyjnym
- Maksymalnie 5% błędów funkcjonalnych po wdrożeniu
- Wszystkie scenariusze krytyczne przetestowane manualnie
- Spełnione wymagania dostępności WCAG 2.1 AA

## 2. Zakres testów

### 2.1 Funkcjonalności w zakresie testów
- ✅ System uwierzytelniania (login, rejestracja, reset hasła)
- ✅ Generowanie fiszek przy pomocy AI
- ✅ Operacje CRUD na fiszkach
- ✅ Filtrowanie, wyszukiwanie i paginacja fiszek
- ✅ Zarządzanie sesjami AI
- ✅ Batch operations (masowe zapisywanie)
- ✅ Responsywność interfejsu
- ✅ Dostępność aplikacji

### 2.2 Funkcjonalności poza zakresem testów
- Wydajność przeglądarek innych niż Chrome, Firefox, Safari, Edge
- Kompatybilność z systemami operacyjnymi innymi niż macOS, Windows, Linux
- Integracja z zewnętrznymi narzędziami (np. Google Analytics)

## 3. Typy testów do przeprowadzenia

### 3.1 Testy automatyczne

#### Testy jednostkowe (Unit Tests)
- **Framework:** Vitest + React Testing Library
- **Pokrycie:** Min. 80% dla usług biznesowych i komponentów krytycznych
- **Zakres:**
  - Funkcje walidacji (Zod schemas)
  - Usługi biznesowe (flashcard.service, ai-generation.service)
  - Komponenty React (formularze, listy, filtry)
  - Utility functions i helpers
  - Middleware Astro

#### Testy integracyjne (Integration Tests)
- **Framework:** Playwright + Vitest
- **Zakres:**
  - API endpoints z bazą danych
  - Integracja z Supabase Auth
  - Komunikacja z OpenRouter API
  - Middleware i routing Astro
  - Transakcje bazodanowe

#### Testy end-to-end (E2E)
- **Framework:** Playwright
- **Scenariusze:**
  - Pełne przepływy użytkownika
  - Testy krytycznych ścieżek
  - Testy responsywności
  - Testy dostępności

### 3.2 Testy manualne

#### Testy eksploracyjne
- Badanie granic aplikacji
- Testy usability
- Testy ad-hoc różnych scenariuszy

#### Testy regresji
- Weryfikacja poprawności po zmianach
- Testy sanity po deployment

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1 Uwierzytelnianie (Priorytet Krytyczny)

#### Scenariusze pozytywne:
1. **Rejestracja nowego użytkownika**
   - Wypełnienie formularza poprawnymi danymi
   - Weryfikacja email (symulacja)
   - Przekierowanie do aplikacji

2. **Logowanie istniejącego użytkownika**
   - Wprowadzenie prawidłowych credentials
   - Ustawienie ciasteczka sesji
   - Przekierowanie do dashboard

3. **Reset hasła**
   - Wysłanie linku resetującego
   - Zmiana hasła przez link
   - Logowanie nowym hasłem

#### Scenariusze negatywne:
1. **Nieprawidłowe dane logowania**
   - Błędny email/hasło
   - Konto nieaktywne
   - Zablokowane konto

2. **Ataki bezpieczeństwa**
   - SQL injection attempts
   - XSS w polach formularza
   - Brute force protection

### 4.2 Generowanie fiszek AI (Priorytet Wysoki)

#### Scenariusze pozytywne:
1. **Generowanie fiszek z tekstu**
   - Wprowadzenie tekstu źródłowego
   - Wybór modelu AI
   - Otrzymanie propozycji fiszek
   - Zapisanie wybranych fiszek

2. **Edycja propozycji**
   - Modyfikacja treści przed zapisem
   - Odrzucenie niektórych propozycji
   - Batch save z różnymi statusami

#### Scenariusze negatywne:
1. **Błędy API zewnętrznego**
   - Timeout połączenia
   - Rate limit przekroczony
   - Nieprawidłowa odpowiedź API

2. **Walidacja danych**
   - Pusty tekst wejściowy
   - Tekst zbyt długi
   - Nieprawidłowy format odpowiedzi

### 4.3 Zarządzanie fiszkami (Priorytet Wysoki)

#### Scenariusze pozytywne:
1. **Tworzenie fiszki manualnej**
   - Wypełnienie formularza
   - Walidacja długości tekstu
   - Zapis i wyświetlenie w bibliotece

2. **Edycja istniejącej fiszki**
   - Zmiana treści front/back
   - Aktualizacja typu źródła
   - Weryfikacja timestampów

3. **Usuwanie fiszki**
   - Soft delete (bez fizycznego usunięcia)
   - Filtrowanie usuniętych elementów
   - Przywracanie usuniętych fiszek

#### Scenariusze negatywne:
1. **Walidacja danych**
   - Tekst zbyt krótki/długi
   - Próba dostępu do cudzych fiszek
   - Nieprawidłowe ID w URL

### 4.4 Biblioteka i wyszukiwanie (Priorytet Średni)

#### Scenariusze pozytywne:
1. **Filtrowanie fiszek**
   - Filtrowanie po typie źródła
   - Filtrowanie po dacie aktualizacji
   - Kombinacja filtrów

2. **Wyszukiwanie**
   - Wyszukiwanie w treści front/back
   - Case-insensitive search
   - Wyszukiwanie z filtrami

3. **Paginacja**
   - Nawigacja między stronami
   - Zmiana rozmiaru strony
   - Zachowanie filtrów przy paginacji

## 5. Środowisko testowe

### 5.1 Środowisko deweloperskie
- **Baza danych:** Supabase (local development)
- **API AI:** OpenRouter (sandbox/mock dla testów)
- **Framework testowy:** Vitest + Playwright
- **CI/CD:** GitHub Actions

### 5.2 Środowisko staging
- **Baza danych:** Supabase staging instance
- **API AI:** OpenRouter production (z limitami)
- **Monitoring:** Sentry dla błędów
- **Testy:** Pełne E2E przed deployment

### 5.3 Test data strategy
- **Seed data:** Przygotowane zestawy testowych fiszek
- **User accounts:** Dedykowane konta testowe
- **Cleanup:** Automatyczne czyszczenie po testach