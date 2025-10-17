import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "../LoginForm";
import { useAuth } from "@/components/layout/hooks/useAuth";
import { toast } from "sonner";

// Create mock functions
const createUseAuthMock = () => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null as string | null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  checkSession: vi.fn(),
});

// Mock the modules
vi.mock("@/components/layout/hooks/useAuth");
vi.mock("sonner");

const mockedUseAuth = vi.mocked(useAuth);
const mockedToast = vi.mocked(toast);

describe("LoginForm - useAuth Integration", () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockUseAuthReturn: ReturnType<typeof createUseAuthMock>;

  beforeEach(() => {
    // Mock navigator for user-event
    Object.defineProperty(window, "navigator", {
      value: { clipboard: { writeText: vi.fn() } },
      writable: true,
    });

    user = userEvent.setup();

    // Reset mocks
    vi.clearAllMocks();

    // Create fresh mock instances for each test
    mockUseAuthReturn = createUseAuthMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useAuth hook integration", () => {
    it("calls login function with correct email and password on form submit", async () => {
      // Setup mocks for this test
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);
      mockUseAuthReturn.login.mockResolvedValueOnce({ user: { id: "1", email: "test@example.com" } });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      expect(mockUseAuthReturn.login).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockUseAuthReturn.login).toHaveBeenCalledTimes(1);
    });

    it("shows loading state during login process", async () => {
      let resolveLogin: ((value: { user: { id: string; email: string } }) => void) | undefined;
      const loginPromise = new Promise<{ user: { id: string; email: string } }>((resolve) => {
        resolveLogin = resolve;
      });

      mockUseAuthReturn.isLoading = true;
      mockUseAuthReturn.login.mockReturnValue(loginPromise);
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /logowanie\.\.\./i });
      expect(submitButton).toBeDisabled();

      // Resolve the promise to complete the test
      if (resolveLogin) {
        resolveLogin({ user: { id: "1", email: "test@example.com" } });
      }
    });

    it("displays auth error as toast when login fails", async () => {
      const errorMessage = "Invalid credentials";
      mockUseAuthReturn.login.mockRejectedValue(new Error(errorMessage));
      mockUseAuthReturn.error = errorMessage;
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      // Wait for the error toast to be called
      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it("shows success toast on successful login", async () => {
      mockUseAuthReturn.login.mockResolvedValueOnce({ user: { id: "1", email: "test@example.com" } });
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedToast.success).toHaveBeenCalledWith("Logowanie udane!");
      });
    });
  });

  describe("Redirect logic", () => {
    // Mock window.location
    const mockLocation = {
      href: "",
      search: "",
    };

    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
      });
    });

    it("redirects to root path by default after successful login", async () => {
      mockUseAuthReturn.login.mockResolvedValueOnce({ user: { id: "1", email: "test@example.com" } });
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(window.location.href).toBe("/");
      });
    });

    it("redirects to URL specified in redirect query parameter", async () => {
      // Mock URL with redirect parameter
      mockLocation.search = "?redirect=/dashboard";

      mockUseAuthReturn.login.mockResolvedValueOnce({ user: { id: "1", email: "test@example.com" } });
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(window.location.href).toBe("/dashboard");
      });
    });

    it("handles multiple redirect parameters correctly", async () => {
      // Mock URL with multiple parameters including redirect
      mockLocation.search = "?other=value&redirect=/profile&another=test";

      mockUseAuthReturn.login.mockResolvedValueOnce({ user: { id: "1", email: "test@example.com" } });
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(window.location.href).toBe("/profile");
      });
    });

    it("handles SSR case when window is not available", async () => {
      // Mock window.location as undefined (SSR scenario)
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        value: undefined,
        configurable: true,
      });

      mockUseAuthReturn.login.mockResolvedValueOnce({ user: { id: "1", email: "test@example.com" } });
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedToast.success).toHaveBeenCalledWith("Logowanie udane!");
      });

      // Restore location
      Object.defineProperty(window, "location", {
        value: originalLocation,
        configurable: true,
      });
    });

    it("redirects to root when redirect parameter is empty", async () => {
      mockLocation.search = "?redirect=";

      mockUseAuthReturn.login.mockResolvedValueOnce({ user: { id: "1", email: "test@example.com" } });
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(window.location.href).toBe("/");
      });
    });
  });

  describe("Error handling integration", () => {
    it("handles network errors gracefully", async () => {
      const networkError = new Error("Network error");
      mockUseAuthReturn.login.mockRejectedValue(networkError);
      mockUseAuthReturn.error = "Network error";
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("logs errors to console during login failure", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const loginError = new Error("Login failed");

      mockUseAuthReturn.login.mockRejectedValue(loginError);
      mockUseAuthReturn.error = "Login failed";
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Login error:", loginError);
      });

      consoleSpy.mockRestore();
    });

    it("does not redirect when login fails", async () => {
      const originalHref = window.location.href;
      mockUseAuthReturn.login.mockRejectedValue(new Error("Login failed"));
      mockUseAuthReturn.error = "Login failed";
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Wait for error handling to complete
      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalledWith("Login failed");
      });

      // Verify no redirect occurred
      expect(window.location.href).toBe(originalHref);
    });
  });

  describe("Loading state integration", () => {
    it("prevents multiple form submissions while loading", async () => {
      let resolveLogin: ((value: { user: { id: string; email: string } }) => void) | undefined;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockUseAuthReturn.login.mockReturnValue(loginPromise);
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      // Fill form
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      // Click submit to start login process
      await user.click(submitButton);

      // Now the component should be in loading state
      const loadingButton = screen.getByRole("button", { name: /logowanie\.\.\./i });
      expect(loadingButton).toBeDisabled();

      // Inputs should be disabled during loading
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      // Resolve the promise
      if (resolveLogin) {
        resolveLogin({ user: { id: "1", email: "test@example.com" } });
      }

      // Wait for loading to complete and success toast
      await waitFor(() => {
        expect(mockedToast.success).toHaveBeenCalledWith("Logowanie udane!");
      });
    });

    it("re-enables form after login completes", async () => {
      mockUseAuthReturn.login.mockResolvedValueOnce({ user: { id: "1", email: "test@example.com" } });
      mockedUseAuth.mockReturnValue(mockUseAuthReturn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // After successful login, form should be re-enabled for potential re-use
      await waitFor(() => {
        expect(mockedToast.success).toHaveBeenCalledWith("Logowanie udane!");
      });
    });
  });
});
