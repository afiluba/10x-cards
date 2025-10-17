import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../base.page";

/**
 * Component object for the Login Form
 * Encapsulates all interactions with the login form
 */
export class LoginFormComponent extends BasePage {
  private readonly form: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly emailError: Locator;
  private readonly passwordError: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.form = this.getByTestId("login-form");
    this.emailInput = this.getByTestId("login-email-input");
    this.passwordInput = this.getByTestId("login-password-input");
    this.submitButton = this.getByTestId("login-submit-button");
    this.emailError = this.getByTestId("login-email-error");
    this.passwordError = this.getByTestId("login-password-error");
    this.forgotPasswordLink = this.getByTestId("login-forgot-password-link");
    this.registerLink = this.getByTestId("login-register-link");
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
    await this.emailInput.fill(email);
  }

  /**
   * Fill the password input
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
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
    return await this.emailError.isVisible();
  }

  /**
   * Check if password error is visible
   */
  async hasPasswordError(): Promise<boolean> {
    return await this.passwordError.isVisible();
  }

  /**
   * Get email error text
   */
  async getEmailError(): Promise<string> {
    return await this.emailError.textContent() || "";
  }

  /**
   * Get password error text
   */
  async getPasswordError(): Promise<string> {
    return await this.passwordError.textContent() || "";
  }

  /**
   * Check if form has validation error containing specific text
   */
  async hasValidationError(text: string): Promise<boolean> {
    const emailError = await this.emailError.isVisible();
    const passwordError = await this.passwordError.isVisible();
    
    if (emailError) {
      const emailText = await this.getEmailError();
      if (emailText.includes(text)) return true;
    }
    
    if (passwordError) {
      const passwordText = await this.getPasswordError();
      if (passwordText.includes(text)) return true;
    }
    
    return false;
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click register link
   */
  async clickRegisterLink(): Promise<void> {
    await this.registerLink.click();
  }

  /**
   * Complete flow: fill form and submit
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
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
}

