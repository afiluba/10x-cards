# System Feature Flags

System feature flags umożliwia niezależne włączanie/wyłączanie funkcjonalności aplikacji w zależności od środowiska deploymentu.

## Instalacja i Użycie

### Import

```typescript
import { isFeatureEnabled, FeatureFlag } from '@/features';
```

### Sprawdzanie Stanu Flagi

```typescript
if (isFeatureEnabled(FeatureFlag.AI_GENERATION)) {
  // Kod wykonywany gdy funkcjonalność jest włączona
  console.log('AI Generation is enabled');
}
```

### Dostępne Flagi

System obecnie wspiera następujące flagi:

- `FeatureFlag.AUTH` - Kontrola dostępu do funkcjonalności autoryzacji
- `FeatureFlag.AI_GENERATION` - Kontrola dostępu do generowania fiszek przez AI

## Konfiguracja Środowisk

System rozpoznaje trzy środowiska:
- `local` - Środowisko deweloperskie
- `integration` - Środowisko testowe
- `production` - Środowisko produkcyjne

Środowisko jest wykrywane automatycznie na podstawie zmiennej środowiskowej `PUBLIC_ENV_NAME`.

### Domyślna Konfiguracja

```typescript
{
  local: {
    auth: true,
    ai-generation: true,
  },
  integration: {
    auth: true,
    ai-generation: false,  // Wyłączone dla testów E2E
  },
  production: {
    auth: true,
    ai-generation: true,
  },
}
```

## Przykłady Użycia

### W Komponentach React

```typescript
import { isFeatureEnabled, FeatureFlag } from '@/features';

export function MyComponent() {
  if (!isFeatureEnabled(FeatureFlag.AI_GENERATION)) {
    return <div>Feature not available</div>;
  }
  
  return <div>AI Generation feature content</div>;
}
```

### W API Endpoints

```typescript
import { isFeatureEnabled, FeatureFlag } from '@/features';

export async function POST({ request }: APIContext) {
  if (!isFeatureEnabled(FeatureFlag.AI_GENERATION)) {
    return new Response(JSON.stringify({ error: 'Feature disabled' }), {
      status: 403,
    });
  }
  
  // Logika endpointu
}
```

### W Stronach Astro

```astro
---
import { isFeatureEnabled, FeatureFlag } from '@/features';

if (!isFeatureEnabled(FeatureFlag.AUTH)) {
  return Astro.redirect('/');
}
---

<div>Strona z funkcjonalnością auth</div>
```

## Dodawanie Nowych Flag

1. Dodaj nową flagę do `FeatureFlag` enum w `src/features/types.ts`:
```typescript
export enum FeatureFlag {
  AUTH = 'auth',
  AI_GENERATION = 'ai-generation',
  NEW_FEATURE = 'new-feature', // Nowa flaga
}
```

2. Zaktualizuj konfigurację w `src/features/config.ts`:
```typescript
export const featureConfig: FeatureConfig = {
  local: {
    [FeatureFlag.NEW_FEATURE]: true,
  },
  integration: {
    [FeatureFlag.NEW_FEATURE]: false,
  },
  production: {
    [FeatureFlag.NEW_FEATURE]: true,
  },
};
```

## Bezpieczeństwo

- Flagi których nie ma w konfiguracji domyślnie zwracają `false`
- Nieprawidłowe wartości `PUBLIC_ENV_NAME` powodują fallback na środowisko `local`
- TypeScript zapewnia type safety przy korzystaniu z flag (uniknięcie literówek)

## Architektura

```
src/features/
├── index.ts           # Główny interfejs API
├── types.ts           # Definicje typów TypeScript
├── config.ts          # Konfiguracja flag dla środowisk
├── README.md          # Ta dokumentacja
└── __tests__/
    └── index.test.ts  # Testy jednostkowe
```

