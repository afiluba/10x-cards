import { test, expect } from "./fixtures/database.fixture";
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
      await myCardsPage.createModal.waitForModal();
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
    });
  });

  test.describe("View Flashcards", () => {
    test("should display flashcards grid when flashcards exist", async () => {
      // Create a flashcard first
      await myCardsPage.createNewFlashcard("Test Question", "Test Answer");

      // Wait for flashcard to appear in DOM
      await myCardsPage.waitForFlashcardWithText("Test Question");

      // Wait for loading to finish and grid to be visible
      await myCardsPage.waitForFlashcards();
    });

    test("should flip flashcard on click", async () => {
      // Create a flashcard
      await myCardsPage.createNewFlashcard("Przód", "Tył");

      // Get first card and flip it
      const card = myCardsPage.getFirstFlashcardCard();
      await card.waitForCard();
      await card.flip();
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

      // Verify original text is still present (form close doesn't guarantee the card is still there)
      expect(await myCardsPage.hasFlashcardWithText(originalText)).toBe(true);
    });
  });

  test.describe("Delete Flashcard", () => {
    test("should delete flashcard successfully", async () => {
      // Create a flashcard
      const textToDelete = "To Delete";
      await myCardsPage.createNewFlashcard(textToDelete, "Back");

      // Wait for flashcard to appear in DOM
      await myCardsPage.waitForFlashcardWithText(textToDelete);

      // Wait for grid to become visible
      await expect(myCardsPage.page.locator('[data-test-id="flashcard-grid"]')).toBeVisible();

      // Get initial count
      const initialCount = await myCardsPage.getFlashcardCount();
      expect(initialCount).toBeGreaterThan(0);

      // Delete the flashcard
      await myCardsPage.deleteFlashcard(0);

      // Wait for the count to actually decrease (using toPass for retry logic)
      await expect(async () => {
        const newCount = await myCardsPage.getFlashcardCount();
        expect(newCount).toBe(initialCount - 1);
      }).toPass({ timeout: 5000 });
    });

    test("should cancel delete without removing flashcard", async () => {
      // Create a flashcard
      const textToKeep = "Keep This";
      await myCardsPage.createNewFlashcard(textToKeep, "Back");

      // Wait for flashcard to appear in DOM
      await myCardsPage.waitForFlashcardWithText(textToKeep);

      // Wait for grid to become visible
      await expect(myCardsPage.page.locator('[data-test-id="flashcard-grid"]')).toBeVisible();

      // Wait for DOM to stabilize and get initial count
      let initialCount = 0;
      await expect(async () => {
        initialCount = await myCardsPage.getFlashcardCount();
        expect(initialCount).toBeGreaterThan(0);
      }).toPass({ timeout: 5000 });

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

      // Wait for filter to apply and verify flashcard is visible
      await expect(async () => {
        expect(await myCardsPage.isFlashcardGridVisible()).toBe(true);
      }).toPass({ timeout: 5000 });
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
      test.slow();
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
