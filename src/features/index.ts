/**
 * Główny interfejs API systemu Feature Flags
 */

import type { Environment } from "./types";
import { FeatureFlag } from "./types";
import { featureConfig } from "./config";

/**
 * Pobiera bieżące środowisko z zmiennej ENV_NAME
 * @returns Nazwa środowiska lub null jeśli nieprawidłowe
 */
function getCurrentEnvironment(): Environment | null {
  const envName = import.meta.env.ENV_NAME;

  // Walidacja środowiska
  const validEnvironments: Environment[] = ["local", "integration", "production"];

  if (envName && validEnvironments.includes(envName as Environment)) {
    return envName as Environment;
  }

  // Zwracamy null dla nieprawidłowego środowiska
  // eslint-disable-next-line no-console
  console.warn(`Invalid or missing ENV_NAME: "${envName}". All features will be disabled.`);
  return null;
}

/**
 * Sprawdza czy dana funkcjonalność jest włączona w aktualnym środowisku
 *
 * @param featureFlag - Flaga funkcjonalności do sprawdzenia
 * @returns true jeśli funkcjonalność jest włączona, false w przeciwnym razie
 *
 * @example
 * ```typescript
 * import { isFeatureEnabled, FeatureFlag } from '@/features';
 *
 * if (isFeatureEnabled(FeatureFlag.AI_GENERATION)) {
 *   // Kod dla włączonej funkcjonalności AI
 * }
 * ```
 */
export function isFeatureEnabled(featureFlag: FeatureFlag): boolean {
  const environment = getCurrentEnvironment();

  // Zwracamy false jeśli środowisko jest nieprawidłowe
  if (environment === null) {
    return false;
  }

  const envConfig = featureConfig[environment];

  // Domyślnie zwracamy false jeśli flaga nie istnieje
  return envConfig[featureFlag] ?? false;
}

// Re-export typów dla wygody użytkowników
export { FeatureFlag } from "./types";
export type { Environment, FeatureConfig } from "./types";
