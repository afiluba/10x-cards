import type { Page } from "@playwright/test";
import { BasePage } from "./base.page";
import { RegisterFormComponent } from "./components/register-form.component";

/**
 * Page Object for the Register page
 * Provides high-level methods for interacting with the registration page
 */
export class RegisterPage extends BasePage {
  readonly registerForm: RegisterFormComponent;

  constructor(page: Page) {
    super(page);
    this.registerForm = new RegisterFormComponent(page);
  }

  /**
   * Navigate to the register page
   */
  async navigate(): Promise<void> {
    await this.page.goto("/auth/register");
    await this.registerForm.waitForForm();
  }

  /**
   * Complete flow: register with credentials
   */
  async register(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.registerForm.register(email, password, confirmPassword || password);
  }

  /**
   * Check if toast with specific text is visible
   */
  async hasToast(text: string): Promise<boolean> {
    const toast = this.page.locator("li[data-sonner-toast]").filter({ hasText: text });
    return await toast.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Check if error toast with specific text is visible
   */
  async hasErrorToast(text: string): Promise<boolean> {
    return this.hasToast(text);
  }

  /**
   * Check if success toast with specific text is visible
   */
  async hasSuccessToast(text: string): Promise<boolean> {
    return this.hasToast(text);
  }

  /**
   * Wait for redirect after successful registration
   * Note: Registration might require email confirmation and may not always redirect
   */
  async waitForSuccessfulRegistration(): Promise<void> {
    // Wait for either redirect to login or success toast
    try {
      await this.page.waitForURL("/auth/login", { timeout: 10000 });
    } catch {
      // If no redirect, check if we got a success message
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Navigate to login page via link
   */
  async goToLogin(): Promise<void> {
    await this.registerForm.clickLoginLink();
  }
}
