/**
 * Testy jednostkowe dla systemu Feature Flags
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isFeatureEnabled, FeatureFlag } from "../index";

describe("Feature Flags System", () => {
  beforeEach(() => {
    // Ustaw domyślne środowisko przed każdym testem
    vi.stubEnv("ENV_NAME", "local");
  });

  afterEach(() => {
    // Wyczyść wszystkie mock'i po każdym teście
    vi.unstubAllEnvs();
  });

  describe("isFeatureEnabled", () => {
    describe("invalid environment behavior", () => {
      it("should return false for all features when ENV_NAME is undefined", () => {
        vi.stubEnv("ENV_NAME", undefined);

        // Dla nieprawidłowego środowiska wszystkie flagi są false
        expect(isFeatureEnabled(FeatureFlag.AUTH)).toBe(false);
        expect(isFeatureEnabled(FeatureFlag.AI_GENERATION)).toBe(false);
      });

      it("should return false for all features when ENV_NAME is invalid", () => {
        vi.stubEnv("ENV_NAME", "invalid-environment");

        // Dla nieprawidłowego środowiska wszystkie flagi są false
        expect(isFeatureEnabled(FeatureFlag.AUTH)).toBe(false);
        expect(isFeatureEnabled(FeatureFlag.AI_GENERATION)).toBe(false);
      });

      it("should log warning when ENV_NAME is invalid", () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.stubEnv("ENV_NAME", "invalid-environment");

        isFeatureEnabled(FeatureFlag.AUTH);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid or missing ENV_NAME"));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("All features will be disabled"));

        consoleSpy.mockRestore();
      });
    });

    describe("valid environment behavior", () => {
      it("should not throw error for valid environments", () => {
        expect(() => {
          vi.stubEnv("ENV_NAME", "local");
          isFeatureEnabled(FeatureFlag.AUTH);

          vi.stubEnv("ENV_NAME", "integration");
          isFeatureEnabled(FeatureFlag.AUTH);

          vi.stubEnv("ENV_NAME", "production");
          isFeatureEnabled(FeatureFlag.AUTH);
        }).not.toThrow();
      });

      it("should return boolean for valid environment", () => {
        vi.stubEnv("ENV_NAME", "local");
        const result = isFeatureEnabled(FeatureFlag.AUTH);
        expect(typeof result).toBe("boolean");
      });
    });
  });

  describe("FeatureFlag enum", () => {
    it("should have AUTH flag", () => {
      expect(FeatureFlag.AUTH).toBe("auth");
    });

    it("should have AI_GENERATION flag", () => {
      expect(FeatureFlag.AI_GENERATION).toBe("ai-generation");
    });

    it("should have exactly 2 flags", () => {
      const flags = Object.values(FeatureFlag);
      expect(flags).toHaveLength(2);
    });
  });
});
