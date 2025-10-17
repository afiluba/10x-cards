import type { Page, Locator } from "@playwright/test";

/**
 * Base Page Object class that provides common functionality for all page objects
 */
export class BasePage {
  constructor(public page: Page) {}

  /**
   * Navigate to a specific URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /**
   * Wait for page to be loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get element by test-id
   */
  getByTestId(testId: string): Locator {
    return this.page.locator(`[data-test-id="${testId}"]`);
  }

  /**
   * Wait for element to be visible
   */
  async waitForTestId(testId: string, options?: { timeout?: number }): Promise<void> {
    await this.getByTestId(testId).waitFor({ state: "visible", ...options });
  }

  /**
   * Check if element with test-id is visible
   */
  async isTestIdVisible(testId: string): Promise<boolean> {
    return this.getByTestId(testId).isVisible();
  }

  /**
   * Click element by test-id
   */
  async clickByTestId(testId: string): Promise<void> {
    await this.getByTestId(testId).click();
  }

  /**
   * Fill input by test-id
   */
  async fillByTestId(testId: string, value: string): Promise<void> {
    await this.getByTestId(testId).fill(value);
  }

  /**
   * Get text content of element by test-id
   */
  async getTextByTestId(testId: string): Promise<string> {
    return (await this.getByTestId(testId).textContent()) || "";
  }

  /**
   * Check if user avatar is visible in navbar (indicates logged in state)
   */
  async isUserAvatarVisible(): Promise<boolean> {
    return await this.isTestIdVisible("user-avatar");
  }

  /**
   * Check if user is logged in by checking for user menu trigger
   */
  async isUserLoggedIn(): Promise<boolean> {
    return await this.isTestIdVisible("user-menu-trigger");
  }
}
