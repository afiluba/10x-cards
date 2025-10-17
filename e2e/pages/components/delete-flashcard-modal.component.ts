import { Page, Locator } from "@playwright/test";

/**
 * Page Object for Delete Flashcard Modal component
 */
export class DeleteFlashcardModal {
  private readonly modal: Locator;
  private readonly confirmButton: Locator;
  private readonly cancelButton: Locator;

  constructor(private page: Page) {
    this.modal = page.locator('[data-test-id="delete-flashcard-modal"]');
    this.confirmButton = page.locator('[data-test-id="confirm-delete-button"]');
    this.cancelButton = page.locator('[data-test-id="cancel-delete-button"]');
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
   * Get modal text content (shows flashcard preview)
   */
  async getModalText(): Promise<string> {
    return (await this.modal.textContent()) || "";
  }

  /**
   * Click confirm delete button
   */
  async clickConfirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /**
   * Click cancel button
   */
  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Complete flow: confirm deletion
   */
  async confirmDelete(): Promise<void> {
    await this.waitForModal();
    await this.clickConfirm();
  }

  /**
   * Wait for modal to be hidden (after confirm or cancel)
   */
  async waitForModalClose(): Promise<void> {
    await this.modal.waitFor({ state: "hidden" });
  }
}

