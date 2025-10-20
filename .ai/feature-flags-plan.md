# Plan Implementacji Systemu Feature Flag

## Cel i Zakres

Wprowadzenie systemu feature flag umożliwiającego niezależne włączanie/wyłączanie funkcjonalności aplikacji w zależności od środowiska deploymentu. System będzie wspierał kontrolę na poziomach:

- **Endpointów API** (flashcards, ai-generation, auth)
- **Stron Astro** (login.astro, register.astro, reset-password.astro)
- **Widoczności komponentów** (np. ukrywanie fiszek lub całych sekcji UI)

## Architektura Systemu

### 1. Struktura Katalogów
```
src/features/
├── index.ts           # Główny interfejs API
├── types.ts           # Definicje typów TypeScript
├── config.ts          # Konfiguracja flag dla środowisk
├── README.md          # Dokumentacja użytkowania
└── __tests__/
    └── index.test.ts  # Testy jednostkowe
```

### 2. Typy Danych
```typescript
type Environment = 'local' | 'integration' | 'production';

enum FeatureFlag {
  AUTH = 'auth',
  AI_GENERATION = 'ai-generation',
}

type FeatureConfig = Record<Environment, Record<FeatureFlag, boolean>>;
```

### 3. API Systemu
- `isFeatureEnabled(featureFlag: FeatureFlag): boolean`
- Domyślne zachowanie: `false` gdy flaga nie istnieje
- Wykrywanie środowiska przez zmienną `ENV_NAME`
- **Korzyści**: Pełne TypeScript type safety, uniknięcie literówek w nazwach flag

## Konfiguracja Środowisk

### Flagi Początkowe
- `auth`: Kontrola dostępu do funkcjonalności autoryzacji
- `ai-generation`: Kontrola dostępu do generowania fiszek przez AI

### Konfiguracja na Środowiskach
```typescript
const featureConfig: FeatureConfig = {
  local: {
    [FeatureFlag.AUTH]: true,
    [FeatureFlag.AI_GENERATION]: true,
  },
  integration: {
    [FeatureFlag.AUTH]: true,
    [FeatureFlag.AI_GENERATION]: false,  // Wyłączone na potrzeby testów
  },
  production: {
    [FeatureFlag.AUTH]: true,
    [FeatureFlag.AI_GENERATION]: true,
  },
};
```

## Plan Implementacji - Krok po Kroku

### Faza 1: Podstawa Systemu (2-3h)
1. **Utworzenie struktury katalogów**
   - `mkdir src/features`
   - Dodanie do .gitignore jeśli potrzebne

2. **Implementacja typów (`src/features/types.ts`)**
   - Definicje `Environment` i `FeatureConfig`
   - Typy pomocnicze dla lepszego TypeScript support

3. **Konfiguracja flag (`src/features/config.ts`)**
   - Statyczna konfiguracja dla wszystkich środowisk
   - Dodanie flag "auth" i "ai-generation"

4. **Główny interfejs (`src/features/index.ts`)**
   - Funkcja `isFeatureEnabled()`
   - Logika wykrywania środowiska (PUBLIC_ENV_NAME)
   - Obsługa fallback dla nieprawidłowych środowisk (zwracamy wartosc false!)

5. **Aktualizacja `src/env.d.ts`**
   - Dodanie typu dla `PUBLIC_ENV_NAME` w `ImportMetaEnv`