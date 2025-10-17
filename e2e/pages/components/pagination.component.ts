import { Page, Locator } from "@playwright/test";

/**
 * Page Object for Pagination component
 */
export class Pagination {
  private readonly pagination: Locator;
  private readonly pageSizeSelect: Locator;
  private readonly previousButton: Locator;
  private readonly nextButton: Locator;
  private readonly pageNumbers: Locator;
  private readonly totalItems: Locator;

  constructor(private page: Page) {
    this.pagination = page.locator('[data-test-id="pagination"]');
    this.pageSizeSelect = page.locator('[data-test-id="page-size-select"]');
    this.previousButton = page.locator('[data-test-id="previous-page-button"]');
    this.nextButton = page.locator('[data-test-id="next-page-button"]');
    this.pageNumbers = page.locator('[data-test-id="page-numbers"]');
    this.totalItems = page.locator('[data-test-id="total-items"]');
  }

  /**
   * Check if pagination is visible
   */
  async isVisible(): Promise<boolean> {
    return this.pagination.isVisible();
  }

  /**
   * Wait for pagination to be visible
   */
  async waitForPagination(): Promise<void> {
    await this.pagination.waitFor({ state: "visible" });
  }

  /**
   * Change page size
   */
  async changePageSize(size: "10" | "20" | "50" | "100"): Promise<void> {
    await this.pageSizeSelect.click();
    await this.page.locator(`[role="option"][value="${size}"]`).click();
  }

  /**
   * Click previous page button
   */
  async goToPreviousPage(): Promise<void> {
    await this.previousButton.click();
  }

  /**
   * Click next page button
   */
  async goToNextPage(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Go to specific page number
   */
  async goToPage(pageNumber: number): Promise<void> {
    await this.pageNumbers.locator(`button:has-text("${pageNumber}")`).click();
  }

  /**
   * Check if previous button is disabled
   */
  async isPreviousButtonDisabled(): Promise<boolean> {
    return this.previousButton.isDisabled();
  }

  /**
   * Check if next button is disabled
   */
  async isNextButtonDisabled(): Promise<boolean> {
    return this.nextButton.isDisabled();
  }

  /**
   * Get total items count text
   */
  async getTotalItemsText(): Promise<string> {
    return (await this.totalItems.textContent()) || "";
  }

  /**
   * Get total items count as number
   */
  async getTotalItemsCount(): Promise<number> {
    const text = await this.getTotalItemsText();
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Get current active page number
   */
  async getCurrentPage(): Promise<number> {
    const activeButton = this.pageNumbers.locator('button[variant="default"]');
    const text = await activeButton.textContent();
    return text ? parseInt(text.trim(), 10) : 1;
  }
}

