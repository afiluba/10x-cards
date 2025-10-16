import "@testing-library/jest-dom/vitest";
import { expect, vi, beforeAll, afterAll, afterEach } from "vitest";

// Mock environment variables
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Create a more flexible Supabase mock
const createSupabaseMock = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  };

  return {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => mockQuery),
  };
};

// Mock Supabase client for unit tests
vi.mock("@/db/supabase.client", () => ({
  supabase: createSupabaseMock(),
}));

// Mock OpenRouter service
vi.mock("@/lib/services/openrouter.service", () => ({
  openrouterService: {
    generateFlashcards: vi.fn(),
    listModels: vi.fn(),
  },
}));

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Global test cleanup
afterEach(() => {
  vi.clearAllMocks();
});

// Configure Vitest globals
expect.extend({});

// Custom matchers can be added here
declare module "vitest" {
  interface Assertion<T = any> {
    toBeValidFlashcard(): T;
    toHaveValidationError(field: string): T;
  }
}

// Example custom matchers (can be expanded based on needs)
expect.extend({
  toBeValidFlashcard(received) {
    const pass =
      received &&
      typeof received.front === "string" &&
      typeof received.back === "string" &&
      received.front.length > 0 &&
      received.back.length > 0;

    return {
      message: () => `Expected ${received} to be a valid flashcard`,
      pass,
    };
  },

  toHaveValidationError(received, field) {
    const pass = received && received.errors && received.errors[field];

    return {
      message: () => `Expected validation errors to include field "${field}"`,
      pass,
    };
  },
});
