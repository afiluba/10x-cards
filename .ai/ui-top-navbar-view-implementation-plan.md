# Plan implementacji widoku Top Navbar

## 1. Przegląd
Top Navbar to główny komponent nawigacyjny aplikacji 10x-cards, umożliwiający użytkownikom poruszanie się między kluczowymi sekcjami aplikacji oraz zarządzanie sesją użytkownika. Komponent zapewnia przejrzysty desktopowy layout z linkami nawigacyjnymi i menu użytkownika, priorytetowo traktując dostępność i bezpieczeństwo danych.

## 2. Routing widoku
Navbar jest komponentem globalnym dostępnym na wszystkich chronionych stronach aplikacji (wymaga zalogowania). Jest integralną częścią głównego layoutu aplikacji (`Layout.astro`) i nie posiada dedykowanej ścieżki URL.

## 3. Struktura komponentów
```
TopNavbar (główny komponent)
├── Logo (komponent z linkiem do strony głównej)
├── NavigationLinks (lista linków nawigacyjnych)
└── UserMenu (dropdown menu użytkownika)
    ├── Avatar (ikona użytkownika)
    └── DropdownMenu (menu z opcjami)
```

## 4. Szczegóły komponentów

### TopNavbar
- **Opis komponentu:** Główny komponent nawigacyjny, odpowiedzialny za layout całej nawigacji w poziomej strukturze. Łączy wszystkie podkomponenty w spójną całość.
- **Główne elementy:** `<nav>` semantyczny element, kontenery dla logo, linków i sekcji użytkownika, sticky positioning.
- **Obsługiwane interakcje:** Brak bezpośrednich interakcji - deleguje do podkomponentów.
- **Obsługiwana walidacja:** Walidacja obecności użytkownika (wymagane zalogowanie), sprawdzanie aktywnej strony dla highlightingu.
- **Typy:** `TopNavbarProps` (user: UserDTO | null, currentPath: string)
- **Propsy:** `user?: UserDTO, currentPath: string, onLogout?: () => void`

### Logo
- **Opis komponentu:** Logo aplikacji z linkiem nawigacyjnym do strony głównej generowania fiszek.
- **Główne elementy:** `<Link>` z tekstem "10x-cards" lub ikoną, stylizowane zgodnie z brandingiem.
- **Obsługiwane interakcje:** Kliknięcie → nawigacja do `/generate`
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak własnych typów
- **Propsy:** Brak (komponent stateless)

### NavigationLinks
- **Opis komponentu:** Lista linków do głównych sekcji aplikacji z wyróżnieniem aktywnej strony.
- **Główne elementy:** Lista `<Link>` komponentów dla "Generuj fiszki" i "Moje fiszki".
- **Obsługiwane interakcje:** Kliknięcie linku → nawigacja do odpowiedniej strony
- **Obsługiwana walidacja:** Walidacja `currentPath` dla określenia aktywnego linku
- **Typy:** `NavigationItem` (label: string, path: string, isActive: boolean)
- **Propsy:** `currentPath: string, items: NavigationItem[]`

### UserMenu
- **Opis komponentu:** Dropdown menu dla zalogowanego użytkownika zawierające avatar i opcje.
- **Główne elementy:** `DropdownMenu` z `Avatar` jako triggerem, pozycja menu poniżej.
- **Obsługiwane interakcje:** Kliknięcie avatara → otwarcie/zamknięcie menu, wybór "Wyloguj" → wywołanie `onLogout`
- **Obsługiwana walidacja:** Walidacja obecności danych użytkownika
- **Typy:** `UserDTO` dla danych użytkownika
- **Propsy:** `user: UserDTO, onLogout: () => void`

## 5. Typy

### Istniejące typy (z types.ts)
- `UserDTO` - informacje o zalogowanym użytkowniku (id, email, avatar_url?, created_at)

### Nowe typy ViewModel

```typescript
// Struktura pojedynczego elementu nawigacji
export interface NavigationItem {
  label: string;        // Wyświetlana etykieta ("Generuj fiszki", "Moje fiszki")
  path: string;         // Ścieżka URL ("/generate", "/my-cards")
  isActive: boolean;    // Czy element jest aktualnie aktywny
}

// Propsy głównego komponentu TopNavbar
export interface TopNavbarProps {
  user?: UserDTO;              // Dane zalogowanego użytkownika
  currentPath: string;         // Aktualna ścieżka URL dla wyróżnienia aktywnego linku
  onLogout?: () => void;       // Callback wywoływany przy wylogowaniu
}

```

## 6. Zarządzanie stanem
Stan nawigacji jest zarządzany przez rodzica (`Layout.astro`) oraz wewnętrzne hooki komponentów. Główny stan obejmuje:

- **Stan globalny (Layout.astro):** Informacje o użytkowniku z Supabase auth, aktualna ścieżka URL
- **Stan lokalny TopNavbar:** Brak lokalnego stanu - komponent jest stateless
- **Custom hook useAuth:** (jeśli nie istnieje) do zarządzania sesją użytkownika i operacjami wylogowania

Komponent nie wymaga wewnętrznego stanu - wszystkie dane są przekazywane przez propsy.

## 7. Integracja API
Integracja opiera się na Supabase Auth SDK dla zarządzania sesją:

**Żądania:**
- `supabase.auth.getUser()` - pobranie danych aktualnego użytkownika
- `supabase.auth.signOut()` - bezpieczne wylogowanie

**Odpowiedzi:**
- `UserDTO` - dane użytkownika zwracane przez `getUser()`
- `void` - wylogowanie bez dodatkowej odpowiedzi

Obsługa błędów poprzez try/catch z toast notifications dla użytkownika.

## 8. Interakcje użytkownika

1. **Kliknięcie logo** → Przekierowanie do `/generate`
2. **Kliknięcie linków nawigacyjnych** → Przejście do odpowiedniej strony z wyróżnieniem aktywnego linku
3. **Kliknięcie avatara** → Otwarcie dropdown menu z opcjami
4. **Wybór "Wyloguj" z menu** → Bezpieczne wylogowanie i przekierowanie do strony logowania

## 9. Warunki i walidacja
- **Wymagane zalogowanie:** Komponent sprawdza obecność `user` prop - jeśli null, może ukryć navbar lub pokazać przycisk logowania
- **Walidacja ścieżki:** `currentPath` musi być prawidłową ścieżką aplikacji dla poprawnego highlightingu
- **Dostępność danych użytkownika:** Sprawdzenie obecności wymaganych pól `UserDTO` (id, email)

## 10. Obsługa błędów
- **Błąd API podczas wylogowania:** Toast notification z komunikatem błędu, pozostanie zalogowanym
- **Brak danych użytkownika:** Fallback do domyślnego avatara lub ukrycie sekcji użytkownika
- **Błąd nawigacji:** Przechwycenie przez Astro routing, fallback do strony głównej
- **Network errors:** Offline detection z odpowiednim komunikatem
- **Session expiry:** Automatyczne przekierowanie do logowania przy wykryciu nieważnej sesji

## 11. Kroki implementacji

1. **Utworzenie struktury komponentów**
   - Utworzyć katalog `src/components/layout/`
   - Zaimplementować główny komponent `TopNavbar.tsx`

2. **Implementacja podstawowych komponentów**
   - `Logo.tsx` - logo z linkiem do strony głównej
   - `NavigationLinks.tsx` - lista linków z wyróżnieniem aktywnego
   - `UserMenu.tsx` - dropdown menu użytkownika

3. **Integracja z Layout.astro**
   - Dodać `TopNavbar` do głównego layoutu
   - Przekazać propsy: user data i currentPath

4. **Implementacja hooków i stanu**
   - Zintegrować z Supabase auth dla user data
   - Dodać obsługę wylogowania

5. **Stylowanie i dostępność**
   - Zaimplementować Tailwind classes dla desktop layout
   - Dodać aria-labels i keyboard navigation
   - Zapewnić semantyczny HTML z elementami nav

6. **Testowanie i walidacja**
   - Test nawigacji między stronami
   - Walidacja dostępności (keyboard navigation, screen readers)
   - Test przypadków błędów (brak user data, network errors)
