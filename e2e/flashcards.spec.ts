import { test, expect } from "@playwright/test";
import { MyCardsPage } from "./pages";

test.describe("Flashcards Management", () => {
  let myCardsPage: MyCardsPage;

  test.beforeEach(async ({ page }) => {
    // Navigate to My Cards page (authentication handled by auth.setup.ts)
    myCardsPage = new MyCardsPage(page);
    await myCardsPage.navigate();
  });

  test.describe("Create Flashcard", () => {
    test("should open create flashcard modal when clicking add button", async () => {
      // Click add flashcard button
      await myCardsPage.clickAddFlashcard();

      // Verify modal is visible
      await expect(myCardsPage.createModal.isVisible()).resolves.toBe(true);
    });

    test("should create a new flashcard successfully", async () => {
      const frontText = "Co to jest TypeScript?";
      const backText = "TypeScript to typowany nadzbiór JavaScript";

      // Get initial flashcard count
      const initialCount = await myCardsPage.getFlashcardCount();

      // Create new flashcard
      await myCardsPage.createNewFlashcard(frontText, backText);

      // Wait for flashcard to appear in DOM
      await myCardsPage.waitForFlashcardWithText(frontText);

      // If this was the first flashcard, wait for grid to become visible
      if (initialCount === 0) {
        await expect(myCardsPage.page.locator('[data-test-id="flashcard-grid"]')).toBeVisible();
      }

      // Wait for DOM to stabilize by checking the count
      await expect(async () => {
        const currentCount = await myCardsPage.getFlashcardCount();
        expect(currentCount).toBe(initialCount + 1);
      }).toPass({ timeout: 5000 });

      // Verify flashcard contains the text
      expect(await myCardsPage.hasFlashcardWithText(frontText)).toBe(true);
    });

    test("should not allow saving flashcard with empty fields", async () => {
      // Open modal
      await myCardsPage.clickAddFlashcard();
      await myCardsPage.createModal.waitForModal();

      // Try to save without filling fields
      const saveButtonEnabled = await myCardsPage.createModal.isSaveButtonEnabled();
      expect(saveButtonEnabled).toBe(false);

      // Fill only front text
      await myCardsPage.createModal.fillFrontText("Test");
      const stillDisabled = await myCardsPage.createModal.isSaveButtonEnabled();
      expect(stillDisabled).toBe(false);
    });

    test("should close modal when clicking cancel", async () => {
      // Open modal
      await myCardsPage.clickAddFlashcard();
      await myCardsPage.createModal.waitForModal();

      // Fill some data
      await myCardsPage.createModal.fillFrontText("Test front");

      // Click cancel
      await myCardsPage.createModal.clickCancel();

      // Verify modal is closed
      await myCardsPage.createModal.waitForModalClose();
      expect(await myCardsPage.createModal.isVisible()).toBe(false);
    });
  });

  test.describe("View Flashcards", () => {
    test("should display flashcards grid when flashcards exist", async () => {
      // Create a flashcard first
      await myCardsPage.createNewFlashcard("Test Question", "Test Answer");

      // Verify grid is visible
      expect(await myCardsPage.isFlashcardGridVisible()).toBe(true);
    });

    test("should flip flashcard on click", async () => {
      // Create a flashcard
      await myCardsPage.createNewFlashcard("Przód", "Tył");

      // Get first card and flip it
      const card = myCardsPage.getFirstFlashcardCard();
      await card.waitForCard();
      await card.flip();

      // After flipping, verify the card still exists
      expect(await card.isVisible()).toBe(true);
    });
  });

  test.describe("Edit Flashcard", () => {
    test("should edit flashcard successfully", async () => {
      // Create a flashcard first
      await myCardsPage.createNewFlashcard("Original Front", "Original Back");

      // Edit the flashcard
      const newFrontText = "Updated Front";
      const newBackText = "Updated Back";
      await myCardsPage.editFlashcard(0, newFrontText, newBackText);

      // Wait for changes to appear
      await myCardsPage.waitForFlashcardWithText(newFrontText);

      // Verify the updated text is present
      expect(await myCardsPage.hasFlashcardWithText(newFrontText)).toBe(true);
    });

    test("should cancel edit without saving changes", async () => {
      // Create a flashcard
      const originalText = "Original Text";
      await myCardsPage.createNewFlashcard(originalText, "Back");

      // Start editing
      const card = myCardsPage.getFirstFlashcardCard();
      await card.clickEdit();
      await myCardsPage.editForm.waitForForm();

      // Make changes
      await myCardsPage.editForm.fillFrontText("Changed Text");

      // Cancel
      await myCardsPage.editForm.clickCancel();
      await myCardsPage.editForm.waitForFormClose();

      // Verify original text is still present
      expect(await myCardsPage.hasFlashcardWithText(originalText)).toBe(true);
    });
  });

  test.describe("Delete Flashcard", () => {
    test("should delete flashcard successfully", async () => {
      // Create a flashcard
      await myCardsPage.createNewFlashcard("To Delete", "Back");

      // Get initial count
      const initialCount = await myCardsPage.getFlashcardCount();

      // Delete the flashcard
      await myCardsPage.deleteFlashcard(0);

      // Wait for deletion to complete
      await myCardsPage.page.waitForTimeout(500);

      // Verify count decreased
      const newCount = await myCardsPage.getFlashcardCount();
      expect(newCount).toBe(initialCount - 1);
    });

    test("should cancel delete without removing flashcard", async () => {
      // Create a flashcard
      await myCardsPage.createNewFlashcard("Keep This", "Back");

      // Get initial count
      const initialCount = await myCardsPage.getFlashcardCount();

      // Start delete but cancel
      const card = myCardsPage.getFirstFlashcardCard();
      await card.clickDelete();
      await myCardsPage.deleteModal.waitForModal();
      await myCardsPage.deleteModal.clickCancel();
      await myCardsPage.deleteModal.waitForModalClose();

      // Verify count unchanged
      const newCount = await myCardsPage.getFlashcardCount();
      expect(newCount).toBe(initialCount);
    });
  });

  test.describe("Search and Filter", () => {
    test("should search flashcards by text", async () => {
      // Create multiple flashcards
      await myCardsPage.createNewFlashcard("JavaScript Question", "Answer");
      await myCardsPage.createNewFlashcard("TypeScript Question", "Answer");

      // Search for specific text
      await myCardsPage.searchFlashcards("TypeScript");

      // Verify filtered results
      expect(await myCardsPage.hasFlashcardWithText("TypeScript")).toBe(true);
    });

    test("should filter by source type", async () => {
      // Create a manual flashcard
      await myCardsPage.createNewFlashcard("Manual Card", "Back");

      // Filter by MANUAL
      await myCardsPage.filtersPanel.filterBySourceType("MANUAL");

      // Wait for filter to apply
      await myCardsPage.page.waitForTimeout(500);

      // Verify flashcard is visible
      expect(await myCardsPage.isFlashcardGridVisible()).toBe(true);
    });

    test("should clear all filters", async () => {
      // Apply some filters
      await myCardsPage.filtersPanel.search("test");
      await myCardsPage.filtersPanel.filterBySourceType("MANUAL");

      // Clear filters
      await myCardsPage.filtersPanel.clearFilters();

      // Verify search is cleared
      expect(await myCardsPage.filtersPanel.getSearchValue()).toBe("");
    });
  });

  test.describe("Pagination", () => {
    test("should show pagination when there are many flashcards", async () => {
      // Create multiple flashcards (more than default page size)
      for (let i = 1; i <= 21; i++) {
        await myCardsPage.createNewFlashcard(`Question ${i}`, `Answer ${i}`);
      }

      // Check if pagination is visible
      expect(await myCardsPage.pagination.isVisible()).toBe(true);
    });

    test.skip("should navigate between pages", async () => {
      // Skip if not enough flashcards exist
      // This test would need proper setup with enough data
    });
  });
});
