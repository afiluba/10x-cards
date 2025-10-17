import type { Page } from "@playwright/test";
import { BasePage } from "./base.page";
import { LoginFormComponent } from "./components/login-form.component";

/**
 * Page Object for the Login page
 * Provides high-level methods for interacting with the login page
 */
export class LoginPage extends BasePage {
  readonly loginForm: LoginFormComponent;

  constructor(page: Page) {
    super(page);
    this.loginForm = new LoginFormComponent(page);
  }

  /**
   * Navigate to the login page
   */
  async navigate(): Promise<void> {
    await this.page.goto("/auth/login");
    await this.loginForm.waitForForm();
  }

  /**
   * Complete flow: login with credentials
   */
  async login(email: string, password: string): Promise<void> {
    await this.loginForm.login(email, password);
  }

  /**
   * Complete flow: attempt login and wait for error
   */
  async loginExpectingError(email: string, password: string): Promise<void> {
    await this.loginForm.login(email, password);
    // Wait a bit for error toast to appear
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if error toast with specific text is visible
   * Note: This looks for toast notifications which appear on the page
   */
  async hasErrorToast(text: string): Promise<boolean> {
    // Sonner toasts render as list items within an ordered list
    const toast = this.page.locator('li[data-sonner-toast]').filter({ hasText: text });
    return await toast.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Wait for navigation after successful login
   */
  async waitForSuccessfulLogin(): Promise<void> {
    await this.page.waitForURL("/", { timeout: 10000 });
  }

  /**
   * Navigate to register page via link
   */
  async goToRegister(): Promise<void> {
    await this.loginForm.clickRegisterLink();
  }

  /**
   * Navigate to forgot password page via link
   */
  async goToForgotPassword(): Promise<void> {
    await this.loginForm.clickForgotPassword();
  }
}

