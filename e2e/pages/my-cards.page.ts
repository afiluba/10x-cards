import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";
import { CreateFlashcardModal } from "./components/create-flashcard-modal.component";
import { FlashcardCard, FlashcardEditForm } from "./components/flashcard-card.component";
import { FiltersPanel } from "./components/filters-panel.component";
import { DeleteFlashcardModal } from "./components/delete-flashcard-modal.component";
import { Pagination } from "./components/pagination.component";

/**
 * Page Object for My Cards page
 */
export class MyCardsPage extends BasePage {
  readonly url = "/my-cards";

  // Main page elements
  private readonly pageContainer: Locator;
  private readonly loadingState: Locator;
  private readonly errorState: Locator;
  private readonly addFlashcardButton: Locator;
  private readonly flashcardGrid: Locator;
  private readonly emptyMessage: Locator;

  // Components
  readonly createModal: CreateFlashcardModal;
  readonly deleteModal: DeleteFlashcardModal;
  readonly filtersPanel: FiltersPanel;
  readonly pagination: Pagination;
  readonly editForm: FlashcardEditForm;

  constructor(page: Page) {
    super(page);

    // Initialize main elements
    this.pageContainer = page.locator('[data-test-id="my-cards-page"]');
    this.loadingState = page.locator('[data-test-id="loading-state"]');
    this.errorState = page.locator('[data-test-id="error-state"]');
    this.addFlashcardButton = page.locator('[data-test-id="add-flashcard-button"]');
    this.flashcardGrid = page.locator('[data-test-id="flashcard-grid"]');
    this.emptyMessage = page.locator('[data-test-id="empty-flashcards-message"]');

    // Initialize components
    this.createModal = new CreateFlashcardModal(page);
    this.deleteModal = new DeleteFlashcardModal(page);
    this.filtersPanel = new FiltersPanel(page);
    this.pagination = new Pagination(page);
    this.editForm = new FlashcardEditForm(page);
  }

  /**
   * Navigate to My Cards page
   */
  async navigate(): Promise<void> {
    await this.goto(this.url);
    await this.waitForPageToLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageToLoad(): Promise<void> {
    await this.pageContainer.waitFor({ state: "visible" });
    await this.waitForDataLoaded();
  }

  /**
   * Wait for data to be loaded and rendered
   * This waits for either the flashcard grid or empty message to appear
   */
  async waitForDataLoaded(): Promise<void> {
    // Wait for either grid or empty message to be visible
    // This ensures data has been fetched and rendered
    await Promise.race([
      this.flashcardGrid.waitFor({ state: "visible", timeout: 10000 }),
      this.emptyMessage.waitFor({ state: "visible", timeout: 10000 }),
    ]).catch(() => {
      // If neither appears, that's also ok - might be in error state
    });

    // Give React a moment to finish rendering all cards
    await this.page.waitForTimeout(100);
  }

  /**
   * Check if page is in loading state
   */
  async isLoading(): Promise<boolean> {
    return this.loadingState.isVisible();
  }

  /**
   * Check if page shows error state
   */
  async hasError(): Promise<boolean> {
    return this.errorState.isVisible();
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorState.textContent()) || "";
  }

  /**
   * Click add flashcard button to open create modal
   */
  async clickAddFlashcard(): Promise<void> {
    await expect(this.addFlashcardButton).toHaveAttribute("data-ready", "true");
    await this.addFlashcardButton.click();
  }

  /**
   * Check if flashcard grid is visible
   */
  async isFlashcardGridVisible(): Promise<boolean> {
    return this.flashcardGrid.isVisible();
  }

  /**
   * Check if empty message is shown
   */
  async isEmptyMessageVisible(): Promise<boolean> {
    return this.emptyMessage.isVisible();
  }

  /**
   * Get all flashcard cards
   */
  getAllFlashcardCards(): Locator {
    return this.page.locator('[data-test-id="flashcard-card"]');
  }

  /**
   * Get flashcard card by index (0-based)
   */
  getFlashcardCardByIndex(index: number): FlashcardCard {
    const cardLocator = this.getAllFlashcardCards().nth(index);
    return new FlashcardCard(this.page, cardLocator);
  }

  /**
   * Get first flashcard card
   */
  getFirstFlashcardCard(): FlashcardCard {
    return this.getFlashcardCardByIndex(0);
  }

  /**
   * Get last flashcard card
   */
  getLastFlashcardCard(): FlashcardCard {
    const cards = this.getAllFlashcardCards();
    return new FlashcardCard(this.page, cards.last());
  }

  /**
   * Get flashcard card by ID
   */
  getFlashcardCardById(id: string): FlashcardCard {
    const cardLocator = this.page.locator(`[data-test-id="flashcard-card"][data-flashcard-id="${id}"]`);
    return new FlashcardCard(this.page, cardLocator);
  }

  /**
   * Get count of flashcard cards
   */
  async getFlashcardCount(): Promise<number> {
    return this.getAllFlashcardCards().count();
  }

  /**
   * Wait for flashcards to load
   */
  async waitForFlashcards(): Promise<void> {
    await this.flashcardGrid.waitFor({ state: "visible" });
  }

  /**
   * Complete flow: Create a new flashcard
   */
  async createNewFlashcard(frontText: string, backText: string): Promise<void> {
    await this.clickAddFlashcard();
    await this.createModal.createFlashcard(frontText, backText);
    await this.createModal.waitForModalClose();
  }

  /**
   * Complete flow: Edit a flashcard
   */
  async editFlashcard(index: number, frontText: string, backText: string): Promise<void> {
    const card = this.getFlashcardCardByIndex(index);
    await card.clickEdit();
    await this.editForm.editFlashcard(frontText, backText);
    await this.editForm.waitForFormClose();
  }

  /**
   * Complete flow: Delete a flashcard
   */
  async deleteFlashcard(index: number): Promise<void> {
    const card = this.getFlashcardCardByIndex(index);
    await card.clickDelete();
    await this.deleteModal.confirmDelete();
    await this.deleteModal.waitForModalClose();
  }

  /**
   * Complete flow: Search for flashcards
   */
  async searchFlashcards(searchText: string): Promise<void> {
    await this.filtersPanel.search(searchText);
    await this.waitForFlashcards();
  }

  /**
   * Check if flashcard with text exists
   */
  async hasFlashcardWithText(text: string): Promise<boolean> {
    const cards = this.getAllFlashcardCards();
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = new FlashcardCard(this.page, cards.nth(i));
      if (await card.containsText(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Wait for a flashcard with specific text to appear
   */
  async waitForFlashcardWithText(text: string, timeout = 5000): Promise<void> {
    await this.page.waitForFunction(
      async ({ text }) => {
        const cards = document.querySelectorAll('[data-test-id="flashcard-card"]');
        for (const card of cards) {
          if (card.textContent?.includes(text)) {
            return true;
          }
        }
        return false;
      },
      { text },
      { timeout }
    );
  }
}
