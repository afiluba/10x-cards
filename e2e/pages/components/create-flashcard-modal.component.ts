import type { Page, Locator } from "@playwright/test";

/**
 * Page Object for Create Flashcard Modal component
 */
export class CreateFlashcardModal {
  private readonly modal: Locator;
  private readonly form: Locator;
  private readonly frontInput: Locator;
  private readonly backInput: Locator;
  private readonly saveButton: Locator;
  private readonly cancelButton: Locator;

  constructor(private page: Page) {
    this.modal = page.locator('[data-test-id="create-flashcard-modal"]');
    this.form = page.locator('[data-test-id="create-flashcard-form"]');
    this.frontInput = page.locator('[data-test-id="flashcard-front-input"]');
    this.backInput = page.locator('[data-test-id="flashcard-back-input"]');
    this.saveButton = page.locator('[data-test-id="save-flashcard-button"]');
    this.cancelButton = page.locator('[data-test-id="cancel-flashcard-button"]');
  }

  /**
   * Wait for modal to be visible
   */
  async waitForModal(): Promise<void> {
    await this.modal.waitFor({ state: "visible" });
  }

  /**
   * Check if modal is visible
   */
  async isVisible(): Promise<boolean> {
    return this.modal.isVisible();
  }

  /**
   * Fill front text of flashcard
   */
  async fillFrontText(text: string): Promise<void> {
    await this.frontInput.click();
    await this.frontInput.fill(text);
    await this.frontInput.blur();
  }

  /**
   * Fill back text of flashcard
   */
  async fillBackText(text: string): Promise<void> {
    await this.backInput.click();
    await this.backInput.fill(text);
    await this.backInput.blur();
  }

  /**
   * Fill both front and back text
   */
  async fillFlashcardData(frontText: string, backText: string): Promise<void> {
    await this.fillFrontText(frontText);
    await this.fillBackText(backText);
  }

  /**
   * Get front text value
   */
  async getFrontText(): Promise<string> {
    return this.frontInput.inputValue();
  }

  /**
   * Get back text value
   */
  async getBackText(): Promise<string> {
    return this.backInput.inputValue();
  }

  /**
   * Click save button
   */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Click cancel button
   */
  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Check if save button is enabled
   */
  async isSaveButtonEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }

  /**
   * Complete flow: fill form and save
   */
  async createFlashcard(frontText: string, backText: string): Promise<void> {
    await this.waitForModal();
    await this.fillFlashcardData(frontText, backText);
    await this.clickSave();
  }

  /**
   * Wait for modal to be hidden (after successful save)
   */
  async waitForModalClose(): Promise<void> {
    await this.modal.waitFor({ state: "hidden" });
  }
}
