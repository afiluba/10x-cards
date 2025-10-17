import type { Page, Locator } from "@playwright/test";

/**
 * Page Object for Flashcard Card component
 */
export class FlashcardCard {
  readonly card: Locator;
  private readonly editButton: Locator;
  private readonly deleteButton: Locator;

  constructor(
    private page: Page,
    cardLocator?: Locator
  ) {
    // If cardLocator is provided, use it; otherwise, get the first card
    this.card = cardLocator || page.locator('[data-test-id="flashcard-card"]').first();
    this.editButton = this.card.locator('[data-test-id="edit-flashcard-button"]').first();
    this.deleteButton = this.card.locator('[data-test-id="delete-flashcard-button"]').first();
  }

  /**
   * Wait for card to be visible
   */
  async waitForCard(): Promise<void> {
    await this.card.waitFor({ state: "visible" });
  }

  /**
   * Check if card is visible
   */
  async isVisible(): Promise<boolean> {
    return this.card.isVisible();
  }

  /**
   * Click on the card to flip it
   */
  async flip(): Promise<void> {
    await this.card.click();
  }

  /**
   * Click edit button
   */
  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }

  /**
   * Click delete button
   */
  async clickDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  /**
   * Get flashcard ID from data attribute
   */
  async getFlashcardId(): Promise<string | null> {
    return this.card.getAttribute("data-flashcard-id");
  }

  /**
   * Get card text content
   */
  async getText(): Promise<string> {
    return (await this.card.textContent()) || "";
  }

  /**
   * Check if card contains specific text
   */
  async containsText(text: string): Promise<boolean> {
    const cardText = await this.getText();
    return cardText.includes(text);
  }
}

/**
 * Page Object for Flashcard Edit Form component
 */
export class FlashcardEditForm {
  private readonly form: Locator;
  private readonly frontInput: Locator;
  private readonly backInput: Locator;
  private readonly saveButton: Locator;
  private readonly cancelButton: Locator;

  constructor(private page: Page) {
    this.form = page.locator('[data-test-id="flashcard-edit-form"]');
    this.frontInput = page.locator('[data-test-id="edit-front-input"]');
    this.backInput = page.locator('[data-test-id="edit-back-input"]');
    this.saveButton = page.locator('[data-test-id="save-edit-button"]');
    this.cancelButton = page.locator('[data-test-id="cancel-edit-button"]');
  }

  /**
   * Wait for edit form to be visible
   */
  async waitForForm(): Promise<void> {
    await this.form.waitFor({ state: "visible" });
  }

  /**
   * Check if form is visible
   */
  async isVisible(): Promise<boolean> {
    return this.form.isVisible();
  }

  /**
   * Fill front text
   */
  async fillFrontText(text: string): Promise<void> {
    await this.frontInput.click();
    await this.frontInput.fill(text);
    await this.frontInput.blur();
  }

  /**
   * Fill back text
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
   * Complete flow: edit and save flashcard
   */
  async editFlashcard(frontText: string, backText: string): Promise<void> {
    await this.waitForForm();
    await this.fillFlashcardData(frontText, backText);
    await this.clickSave();
  }

  /**
   * Wait for form to be hidden (after save or cancel)
   */
  async waitForFormClose(): Promise<void> {
    await this.form.waitFor({ state: "hidden" });
  }
}
