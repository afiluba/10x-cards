/**
 * Konfiguracja feature flags dla różnych środowisk
 */

import type { FeatureConfig } from "./types";
import { FeatureFlag } from "./types";

/**
 * Statyczna konfiguracja flag dla wszystkich środowisk
 */
export const featureConfig: FeatureConfig = {
  local: {
    [FeatureFlag.AUTH]: true,
    [FeatureFlag.AI_GENERATION]: true,
  },
  integration: {
    [FeatureFlag.AUTH]: true,
    [FeatureFlag.AI_GENERATION]: false,
  },
  production: {
    [FeatureFlag.AUTH]: true,
    [FeatureFlag.AI_GENERATION]: false,
  },
};
