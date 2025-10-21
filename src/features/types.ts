/**
 * Definicje typów dla systemu Feature Flags
 */

/**
 * Dostępne środowiska deploymentu
 */
export type Environment = "local" | "integration" | "production";

/**
 * Enum z dostępnymi feature flags w aplikacji
 */
export enum FeatureFlag {
  AUTH = "auth",
  AI_GENERATION = "ai-generation",
}

/**
 * Konfiguracja flag dla wszystkich środowisk
 * Record<Environment, Record<FeatureFlag, boolean>>
 */
export type FeatureConfig = Record<Environment, Record<FeatureFlag, boolean>>;
