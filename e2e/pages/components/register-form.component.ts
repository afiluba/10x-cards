import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../base.page";

/**
 * Component object for the Register Form
 * Encapsulates all interactions with the registration form
 */
export class RegisterFormComponent extends BasePage {
  private readonly form: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly acceptTermsCheckbox: Locator;
  private readonly submitButton: Locator;
  private readonly emailError: Locator;
  private readonly passwordError: Locator;
  private readonly confirmPasswordError: Locator;
  private readonly termsLink: Locator;
  private readonly privacyLink: Locator;
  private readonly loginLink: Locator;

  constructor(page: Page) {
    super(page);
    this.form = this.getByTestId("register-form");
    this.emailInput = this.getByTestId("register-email-input");
    this.passwordInput = this.getByTestId("register-password-input");
    this.confirmPasswordInput = this.getByTestId("register-confirm-password-input");
    this.acceptTermsCheckbox = this.getByTestId("register-accept-terms-checkbox");
    this.submitButton = this.getByTestId("register-submit-button");
    this.emailError = this.getByTestId("register-email-error");
    this.passwordError = this.getByTestId("register-password-error");
    this.confirmPasswordError = this.getByTestId("register-confirm-password-error");
    this.termsLink = this.getByTestId("register-terms-link");
    this.privacyLink = this.getByTestId("register-privacy-link");
    this.loginLink = this.getByTestId("register-login-link");
  }

  /**
   * Wait for the form to be visible
   */
  async waitForForm(): Promise<void> {
    await this.form.waitFor({ state: "visible" });
  }

  /**
   * Fill the email input
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.click();
    await this.emailInput.fill(email);
    await this.emailInput.blur();
  }

  /**
   * Fill the password input
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
    await this.passwordInput.blur();
  }

  /**
   * Fill the confirm password input
   */
  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.click();
    await this.confirmPasswordInput.fill(password);
    await this.confirmPasswordInput.blur();
  }

  /**
   * Check or uncheck the terms acceptance checkbox
   */
  async setAcceptTerms(checked: boolean): Promise<void> {
    const isCurrentlyChecked = await this.isTermsAccepted();

    if (isCurrentlyChecked !== checked) {
      // Click the checkbox directly
      await this.acceptTermsCheckbox.click();
      // Wait for state to update
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Click the submit button
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Check if email error is visible
   */
  async hasEmailError(): Promise<boolean> {
    return await this.emailError.isVisible().catch(() => false);
  }

  /**
   * Check if password error is visible
   */
  async hasPasswordError(): Promise<boolean> {
    return await this.passwordError.isVisible().catch(() => false);
  }

  /**
   * Check if confirm password error is visible
   */
  async hasConfirmPasswordError(): Promise<boolean> {
    return await this.confirmPasswordError.isVisible().catch(() => false);
  }

  /**
   * Get email error text
   */
  async getEmailError(): Promise<string> {
    return (await this.emailError.textContent()) || "";
  }

  /**
   * Get password error text
   */
  async getPasswordError(): Promise<string> {
    return (await this.passwordError.textContent()) || "";
  }

  /**
   * Get confirm password error text
   */
  async getConfirmPasswordError(): Promise<string> {
    return (await this.confirmPasswordError.textContent()) || "";
  }

  /**
   * Click login link
   */
  async clickLoginLink(): Promise<void> {
    await this.loginLink.click();
  }

  /**
   * Complete flow: fill form and submit
   */
  async register(email: string, password: string, confirmPassword: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(confirmPassword);
    await this.setAcceptTerms(true);
    await this.clickSubmit();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Check if form is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.form.isVisible();
  }

  /**
   * Check if accept terms checkbox is checked
   */
  async isTermsAccepted(): Promise<boolean> {
    // Check for aria-checked or data-state attribute
    const state = await this.acceptTermsCheckbox.getAttribute("data-state");
    return state === "checked";
  }
}
