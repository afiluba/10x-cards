# SPECYFIKACJA ARCHITEKTURY MODUŁU AUTENTYKACJI - 10x-cards

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1 Struktura stron i komponentów

#### Nowe strony Astro (tryb server-side rendering):
- **`/auth/login`** - strona logowania
  - Komponent: `LoginPage.astro`
  - Używa `LoginForm` (React component)
  - Przekierowuje zalogowanych użytkowników na `/generate`
  - Obsługuje parametry URL: `?redirect=` dla przekierowania po logowaniu

- **`/auth/register`** - strona rejestracji
  - Komponent: `RegisterPage.astro`
  - Używa `RegisterForm` (React component)
  - Przekierowuje zarejestrowanych użytkowników na `/generate`
  - Wysyła email weryfikacyjny po rejestracji

- **`/auth/reset-password`** - strona resetowania hasła
  - Komponent: `ResetPasswordPage.astro`
  - Używa `ResetPasswordForm` (React component)
  - Obsługuje parametry URL dla tokena resetowania

#### Rozszerzone komponenty React:
- **`AuthLayout.tsx`** - wspólny layout dla stron autentyfikacji
  - Centrowany kontener bez navbar
  - Tło i stylowanie spójne z aplikacją
  - Linki nawigacyjne między formularzami

- **`LoginForm.tsx`** - formularz logowania
  - Pola: email, hasło
  - Przycisk "Zapomniane hasło?" prowadzący do resetowania
  - Przycisk "Zarejestruj się" prowadzący do rejestracji
  - Integracja z `useAuth` hook dla obsługi logowania

- **`RegisterForm.tsx`** - formularz rejestracji
  - Pola: email, hasło, powtórz hasło
  - Checkbox akceptacji regulaminu i polityki prywatności
  - Przycisk "Masz już konto?" prowadzący do logowania
  - Integracja z `useAuth` hook dla rejestracji

- **`ResetPasswordForm.tsx`** - formularz resetowania hasła
  - Pole: email (dla żądania resetowania)
  - Pola: nowe hasło, powtórz hasło (gdy token jest obecny)
  - Obsługa różnych stanów formularza w zależności od obecności tokena

#### Rozszerzone istniejące komponenty:

- **`TopNavbar.tsx`** - rozszerzenie logiki warunkowego renderowania
  - Dodanie przycisku "Zaloguj się" dla niezalogowanych użytkowników
  - Link do strony logowania zamiast ukrywania UserMenu
  - Zachowanie istniejącej nawigacji dla zalogowanych użytkowników

- **`TopNavbarWrapper.tsx`** - aktualizacja logiki autentyfikacji
  - Zastąpienie mock `useAuth` prawdziwą implementacją
  - Obsługa stanów ładowania podczas sprawdzania sesji
  - Przekierowanie na stronę logowania po wylogowaniu

### 1.2 Rozdzielenie odpowiedzialności między Astro i React

#### Strony Astro (server-side):
- **Odpowiedzialność**: Routing, server-side rendering, wstępne sprawdzanie autentyfikacji
- **Integracja z backendem**: Przekazywanie danych sesji przez `Astro.locals`
- **Nawigacja**: Używanie standardowych linków HTML dla przejść między stronami
- **SEO**: Meta tagi i struktura dla wyszukiwarek

#### Komponenty React (client-side):
- **Odpowiedzialność**: Interaktywne formularze, walidacja w czasie rzeczywistym, obsługa stanów
- **Integracja z backendem**: Komunikacja przez fetch API do endpointów Astro
- **Stan aplikacji**: Zarządzanie stanem formularzy, błędami, stanami ładowania
- **UX**: Optymistyczne aktualizacje, animacje, komunikaty toast

### 1.3 Walidacja i komunikaty błędów

#### Walidacja po stronie klienta (React):
- **Biblioteka**: React Hook Form z Zod schemas
- **Schematy walidacji**:
  ```typescript
  // src/lib/schemas/auth.schemas.ts
  export const loginSchema = z.object({
    email: z.string().email("Nieprawidłowy format email"),
    password: z.string().min(6, "Hasło musi mieć minimum 6 znaków")
  });

  export const registerSchema = z.object({
    email: z.string().email("Nieprawidłowy format email"),
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string()
  }).refine(data => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"]
  });
  ```

#### Komunikaty błędów:
- **Toast notifications**: Użycie `sonner` dla wszystkich komunikatów
- **Błędy formularza**: Wyświetlanie pod polami input w czasie rzeczywistym
- **Błędy API**: Mapowanie błędów Supabase na przyjazne komunikaty
- **Stan ładowania**: Loading states dla przycisków i formularzy

### 1.4 Obsługa kluczowych scenariuszy

#### Scenariusz 1: Pierwszy dostęp (niezalogowany użytkownik)
1. Użytkownik wchodzi na dowolną stronę chronioną
2. Middleware sprawdza sesję i przekierowuje na `/auth/login?redirect=/current-path`
3. Użytkownik widzi formularz logowania z linkami do rejestracji i resetowania hasła
4. Po udanym logowaniu zostaje przekierowany na pierwotną stronę

#### Scenariusz 2: Rejestracja nowego użytkownika
1. Użytkownik klika "Zarejestruj się" na stronie logowania
2. Wypełnia formularz rejestracji z walidacją w czasie rzeczywistym
3. Po wysłaniu formularza:
   - Supabase wysyła email weryfikacyjny
   - Użytkownik widzi komunikat o konieczności weryfikacji email
   - Po weryfikacji zostaje automatycznie zalogowany

#### Scenariusz 3: Resetowanie hasła
1. Użytkownik klika "Zapomniane hasło?" na stronie logowania
2. Wprowadza email i wysyła żądanie
3. Supabase wysyła email z linkiem resetowania
4. Użytkownik klika link i zostaje przekierowany na stronę z formularzem nowego hasła
5. Po zmianie hasła zostaje automatycznie zalogowany

#### Scenariusz 4: Automatyczne wylogowanie (wygaśnięcie sesji)
1. Sesja wygasa (token JWT wygaśnięty)
2. Następne żądanie API zwraca błąd 401
3. Hook `useAuth` wykrywa brak sesji i przekierowuje na logowanie
4. Użytkownik musi się ponownie zalogować

## 2. LOGIKA BACKENDOWA

### 2.1 Struktura endpointów API

#### Nowe endpointy w `/src/pages/api/auth/`:

- **`POST /api/auth/login`** - endpoint logowania
  - **Input**: `{ email: string, password: string }`
  - **Output**: `{ user: UserDTO, session: Session }`
  - **Błędy**: 400 (nieprawidłowe dane), 401 (błędne dane logowania)

- **`POST /api/auth/register`** - endpoint rejestracji
  - **Input**: `{ email: string, password: string }`
  - **Output**: `{ user: UserDTO, message: string }`
  - **Błędy**: 400 (walidacja), 409 (użytkownik istnieje)

- **`POST /api/auth/logout`** - endpoint wylogowania
  - **Input**: brak (używa sesji z ciasteczka)
  - **Output**: `{ success: true }`
  - **Błędy**: 401 (brak sesji)

- **`POST /api/auth/reset-password`** - żądanie resetowania hasła
  - **Input**: `{ email: string }`
  - **Output**: `{ message: string }`
  - **Błędy**: 400 (nieprawidłowy email)

- **`POST /api/auth/update-password`** - aktualizacja hasła z tokenem
  - **Input**: `{ password: string, token: string }`
  - **Output**: `{ user: UserDTO, session: Session }`
  - **Błędy**: 400 (walidacja), 401 (nieprawidłowy token)


### 2.2 Modele danych i kontrakty

#### Rozszerzone typy w `/src/types.ts`:
```typescript
// Komendy API dla autentyfikacji
export interface AuthLoginCommand {
  email: string;
  password: string;
}

export interface AuthRegisterCommand {
  email: string;
  password: string;
}

export interface AuthResetPasswordCommand {
  email: string;
}

export interface AuthUpdatePasswordCommand {
  password: string;
  token?: string; // dla resetowania przez email
}

// Odpowiedzi API
export interface AuthLoginResponseDTO {
  user: UserDTO;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export interface AuthRegisterResponseDTO {
  user: UserDTO;
  message: string;
  email_confirmation_required: boolean;
}
```

#### Schematy walidacji w `/src/lib/schemas/auth.schemas.ts`:
- `loginCommandSchema` - walidacja danych logowania
- `registerCommandSchema` - walidacja danych rejestracji
- `resetPasswordCommandSchema` - walidacja email do resetowania
- `updatePasswordCommandSchema` - walidacja nowego hasła

### 2.3 Mechanizm walidacji danych wejściowych

#### Wielowarstwowa walidacja:
1. **Walidacja schematu**: Zod schemas dla wszystkich inputów API
2. **Walidacja biznesowa**: Sprawdzanie unikalności email, siły hasła
3. **Sanityzacja**: Czyszczenie i normalizacja danych wejściowych

#### Implementacja w endpointach:
```typescript
// Przykład dla endpointu rejestracji
export async function POST({ request }: APIContext) {
  try {
    const body = await request.json();
    const validatedData = registerCommandSchema.parse(body);

    // Dodatkowa walidacja biznesowa
    if (!isValidEmailDomain(validatedData.email)) {
      return errorResponse(400, "INVALID_EMAIL_DOMAIN");
    }

    // Logika rejestracji...
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }
    return errorResponse(500, "INTERNAL_ERROR");
  }
}
```

### 2.4 Obsługa wyjątków

#### Strukturalizowane błędy:
- **ValidationError**: Błędy walidacji schematu (Zod)
- **AuthError**: Błędy autentyfikacji (Supabase)
- **DatabaseError**: Błędy bazy danych
- **RateLimitError**: Ograniczenie liczby prób

#### Middleware obsługi błędów:
- **Globalny handler**: Przechwytywanie wszystkich wyjątków w endpointach
- **Mapowanie błędów**: Konwersja błędów Supabase na standardowe ErrorDTO
- **Logowanie**: Szczegółowe logowanie błędów do monitorowania
- **Rate limiting**: Ochrona przed atakami brute force

### 2.5 Aktualizacja renderowania server-side

#### Rozszerzony middleware `/src/middleware/index.ts`:
```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  // Sprawdzanie sesji dla chronionych tras
  if (requiresAuth(context.url.pathname)) {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
      return context.redirect(`/auth/login?redirect=${encodeURIComponent(context.url.pathname)}`);
    }

    context.locals.user = mapSupabaseUserToUserDTO(session.user);
    context.locals.session = session;
  }

  return next();
});
```

#### Funkcja `requiresAuth()`:
- Definiuje które ścieżki wymagają autentyfikacji
- Wyklucza publiczne ścieżki: `/auth/*`, `/`, statyczne zasoby

#### Server-side rendering dla stron chronionych:
- Strony `/generate`, `/my-cards` automatycznie sprawdzają sesję przez middleware
- Przekazują dane użytkownika przez props do komponentów React zamiast przez API calls
- Renderują pełną stronę tylko dla zalogowanych użytkowników

#### Przekazywanie danych użytkownika do aplikacji React:
```astro
---
// src/pages/generate.astro
import GenerateContainer from "../components/generate/GenerateContainer";

const user = Astro.locals.user; // Dane użytkownika z middleware
---

<Layout>
  <GenerateContainer client:load {user} />
</Layout>
```

Komponenty React otrzymują `user` jako props i przekazują go do hook `useAuth`:

```typescript
// src/components/layout/TopNavbarWrapper.tsx
interface TopNavbarWrapperProps {
  user?: UserDTO; // Przekazane z server-side
}

export function TopNavbarWrapper({ user }: TopNavbarWrapperProps) {
  const { user: clientUser, logout } = useAuth({ initialUser: user });
  // ...
}
```

## 3. SYSTEM AUTENTYKACJI

### 3.1 Integracja z Supabase Auth

#### Konfiguracja klienta Supabase:
- **URL i klucz**: Zmiennych środowiskowych `SUPABASE_URL`, `SUPABASE_KEY`
- **Konfiguracja sesji**: Automatyczne odświeżanie tokenów JWT
- **Ciasteczka**: Bezpieczne przechowywanie sesji po stronie serwera

#### Funkcje mapowania danych:
```typescript
// src/lib/utils/auth.utils.ts
export function mapSupabaseUserToUserDTO(supabaseUser: User): UserDTO {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    avatar_url: supabaseUser.user_metadata?.avatar_url,
    created_at: supabaseUser.created_at
  };
}

export function mapSupabaseError(error: AuthError): ErrorDTO {
  // Mapowanie błędów Supabase na standardowe ErrorDTO
  switch (error.message) {
    case 'Invalid login credentials':
      return { code: 'INVALID_CREDENTIALS', message: 'Nieprawidłowe dane logowania' };
    case 'User already registered':
      return { code: 'USER_EXISTS', message: 'Użytkownik już istnieje' };
    // ... inne mapowania błędów
    default:
      return { code: 'AUTH_ERROR', message: 'Błąd autentyfikacji' };
  }
}
```

#### Strategia autentyfikacji:
- **Email/Password**: Podstawowa metoda logowania
- **Email verification**: Wymagana weryfikacja email przy rejestracji
- **Password reset**: Resetowanie hasła przez email
- **Session management**: Automatyczne zarządzanie sesjami i odświeżaniem tokenów

### 3.2 Hook `useAuth` - prawdziwa implementacja

#### Zastąpienie mock implementacji:
```typescript
// src/components/layout/hooks/useAuth.ts
interface UseAuthOptions {
  initialUser?: UserDTO | null;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { initialUser } = options;
  const [user, setUser] = useState<UserDTO | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  useEffect(() => {
    // Jeśli mamy initialUser, ustaw stan jako załadowany
    if (initialUser !== undefined) {
      setIsLoading(false);
      return;
    }

    // W przeciwnym razie sprawdź sesję (dla stron bez SSR)
    checkSession();

    // Listener zmian stanu autentyfikacji
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(mapSupabaseUserToUserDTO(session.user));
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [initialUser]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw mapSupabaseError(error);
    return { user: mapSupabaseUserToUserDTO(data.user!), session: data.session };
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw mapSupabaseError(error);
    return { user: mapSupabaseUserToUserDTO(data.user!), session: data.session };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw mapSupabaseError(error);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw mapSupabaseError(error);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword
  };
}
```

#### Funkcje pomocnicze:
- **`mapSupabaseUserToUserDTO()`**: Konwersja użytkownika Supabase na UserDTO (używana w middleware i hooku)
- **`mapSupabaseError()`**: Mapowanie błędów Supabase na przyjazne komunikaty
- **`checkSession()`**: Sprawdzanie aktualnej sesji przy montowaniu komponentu (tylko dla stron bez SSR)

### 3.3 Zarządzanie sesjami i bezpieczeństwem

#### Mechanizm sesji:
- **JWT tokens**: Długoterminowe sesje z automatycznym odświeżaniem
- **Server-side cookies**: Bezpieczne przechowywanie po stronie serwera
- **Session timeout**: Automatyczne wylogowanie po okresie nieaktywności

#### Bezpieczeństwo:
- **HTTPS only**: Wymuszanie szyfrowanego połączenia
- **CSRF protection**: Ochrona przed atakami CSRF
- **Rate limiting**: Ograniczenie liczby prób logowania
- **Password policies**: Wymagania siły hasła
- **Audit logging**: Logowanie wszystkich operacji autentyfikacji

#### RODO i prywatność:
- **Data minimization**: Przechowywanie tylko niezbędnych danych
- **Right to erasure**: Możliwość usunięcia konta i wszystkich danych
- **Data export**: Udostępnienie danych użytkownika na żądanie
- **Consent management**: Zarządzanie zgodami na przetwarzanie danych

### 3.4 Integracja z istniejącymi funkcjonalnościami

#### Flashcards API:
- Wszystkie endpointy flashcards automatycznie używają `context.locals.user.id`
- Zapytania filtrowane po `user_id` dla bezpieczeństwa
- Middleware zapewnia, że tylko właściciel może modyfikować swoje fiszki

#### AI Generation:
- Sesje generowania powiązane z użytkownikiem
- Audit logging zawiera informacje o użytkowniku
- Limity wykorzystania API per użytkownik

#### Nawigacja i routing:
- Chronione strony automatycznie przekierowują na logowanie
- Stan autentyfikacji wpływa na dostępne opcje nawigacji
- Breadcrumbs i historia przeglądania respektują stan logowania

### 3.5 Testowanie i monitorowanie

#### Strategia testowania:
- **Unit tests**: Testy hooków, komponentów i funkcji pomocniczych
- **Integration tests**: Testy endpointów API z Supabase
- **E2E tests**: Scenariusze użytkownika dla pełnych przepływów

#### Monitorowanie:
- **Error tracking**: Logowanie błędów autentyfikacji
- **Analytics**: Śledzenie konwersji rejestracji/logowania
- **Performance**: Monitorowanie czasów odpowiedzi endpointów
- **Security monitoring**: Wykrywanie podejrzanych aktywności

---

**Data utworzenia**: $(date)
**Data ostatniej aktualizacji**: $(date)
**Wersja specyfikacji**: 1.1
**Autor**: AI Assistant
**Status**: Gotowa do implementacji

**Zmiany w wersji 1.1:**
- Usunięty endpoint GET /api/auth/session
- Zmienione podejście do przekazywania danych użytkownika - server-side props zamiast API calls
- Zaktualizowany hook useAuth z opcjami initialUser
- Dodane funkcje mapowania danych w src/lib/utils/auth.utils.ts
