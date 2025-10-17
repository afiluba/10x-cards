import { Page, Locator } from "@playwright/test";

/**
 * Page Object for Filters Panel component
 */
export class FiltersPanel {
  private readonly panel: Locator;
  private readonly searchInput: Locator;
  private readonly sourceTypeFilter: Locator;
  private readonly sortSelect: Locator;
  private readonly clearButton: Locator;

  constructor(private page: Page) {
    this.panel = page.locator('[data-test-id="filters-panel"]');
    this.searchInput = page.locator('[data-test-id="search-input"]');
    this.sourceTypeFilter = page.locator('[data-test-id="source-type-filter"]');
    this.sortSelect = page.locator('[data-test-id="sort-select"]');
    this.clearButton = page.locator('[data-test-id="clear-filters-button"]');
  }

  /**
   * Wait for panel to be visible
   */
  async waitForPanel(): Promise<void> {
    await this.panel.waitFor({ state: "visible" });
  }

  /**
   * Check if panel is visible
   */
  async isVisible(): Promise<boolean> {
    return this.panel.isVisible();
  }

  /**
   * Search for flashcards by text
   */
  async search(searchText: string): Promise<void> {
    await this.searchInput.fill(searchText);
    // Wait for debounce (300ms)
    await this.page.waitForTimeout(350);
  }

  /**
   * Get current search value
   */
  async getSearchValue(): Promise<string> {
    return this.searchInput.inputValue();
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(350);
  }

  /**
   * Filter by source type
   */
  async filterBySourceType(sourceType: "all" | "AI_ORIGINAL" | "AI_EDITED" | "MANUAL"): Promise<void> {
    await this.sourceTypeFilter.click();
    await this.page.locator(`[role="option"][data-value="${sourceType}"]`).click();
  }

  /**
   * Sort flashcards
   */
  async sortBy(sortOption: "created_at:desc" | "created_at:asc" | "updated_at:desc" | "updated_at:asc"): Promise<void> {
    await this.sortSelect.click();
    await this.page.locator(`[role="option"][data-value="${sortOption}"]`).click();
  }

  /**
   * Click clear filters button
   */
  async clearFilters(): Promise<void> {
    await this.clearButton.click();
  }

  /**
   * Apply multiple filters at once
   */
  async applyFilters(options: {
    search?: string;
    sourceType?: "all" | "AI_ORIGINAL" | "AI_EDITED" | "MANUAL";
    sort?: "created_at:desc" | "created_at:asc" | "updated_at:desc" | "updated_at:asc";
  }): Promise<void> {
    if (options.search !== undefined) {
      await this.search(options.search);
    }
    if (options.sourceType) {
      await this.filterBySourceType(options.sourceType);
    }
    if (options.sort) {
      await this.sortBy(options.sort);
    }
  }
}

