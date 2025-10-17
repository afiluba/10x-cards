# Page Object Model (POM) Documentation

This directory contains Page Object Model (POM) classes for E2E testing with Playwright.

## Structure

```
e2e/pages/
├── base.page.ts                          # Base page with common functionality
├── my-cards.page.ts                      # My Cards page object
├── index.ts                              # Central exports
└── components/                           # Reusable component objects
    ├── create-flashcard-modal.component.ts
    ├── delete-flashcard-modal.component.ts
    ├── flashcard-card.component.ts
    ├── filters-panel.component.ts
    └── pagination.component.ts
```

## Design Principles

### 1. **Encapsulation**
Each page object encapsulates all selectors and interactions for a specific page or component.

### 2. **Reusability**
Components can be reused across multiple pages.

### 3. **Maintainability**
Changes to UI require updates only in page objects, not in test files.

### 4. **Readability**
Tests read like natural language, hiding implementation details.

## Usage Examples

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";
import { MyCardsPage } from "./pages";

test("should create a flashcard", async ({ page }) => {
  const myCardsPage = new MyCardsPage(page);
  
  await myCardsPage.navigate();
  await myCardsPage.createNewFlashcard("Front", "Back");
  
  expect(await myCardsPage.hasFlashcardWithText("Front")).toBe(true);
});
```

### Using Components Directly

```typescript
test("should use modal directly", async ({ page }) => {
  const myCardsPage = new MyCardsPage(page);
  
  await myCardsPage.navigate();
  await myCardsPage.clickAddFlashcard();
  
  // Access modal component directly
  await myCardsPage.createModal.waitForModal();
  await myCardsPage.createModal.fillFrontText("Test");
  await myCardsPage.createModal.fillBackText("Answer");
  await myCardsPage.createModal.clickSave();
});
```

### Working with Individual Cards

```typescript
test("should edit specific card", async ({ page }) => {
  const myCardsPage = new MyCardsPage(page);
  
  await myCardsPage.navigate();
  
  // Get specific card
  const firstCard = myCardsPage.getFirstFlashcardCard();
  await firstCard.clickEdit();
  
  // Edit using edit form component
  await myCardsPage.editForm.editFlashcard("New Front", "New Back");
});
```

### Using Filters and Search

```typescript
test("should filter flashcards", async ({ page }) => {
  const myCardsPage = new MyCardsPage(page);
  
  await myCardsPage.navigate();
  
  // Use filters panel
  await myCardsPage.filtersPanel.search("typescript");
  await myCardsPage.filtersPanel.filterBySourceType("MANUAL");
  await myCardsPage.filtersPanel.sortBy("created_at:desc");
  
  // Or use combined filters
  await myCardsPage.filtersPanel.applyFilters({
    search: "typescript",
    sourceType: "MANUAL",
    sort: "created_at:desc"
  });
});
```

## Page Objects

### BasePage

Base class providing common functionality for all page objects:

- `getByTestId(testId)` - Get element by data-test-id
- `waitForTestId(testId)` - Wait for element to be visible
- `clickByTestId(testId)` - Click element
- `fillByTestId(testId, value)` - Fill input

### MyCardsPage

Main page object for `/my-cards` route:

**Properties:**
- `createModal` - CreateFlashcardModal component
- `deleteModal` - DeleteFlashcardModal component
- `filtersPanel` - FiltersPanel component
- `pagination` - Pagination component
- `editForm` - FlashcardEditForm component

**Key Methods:**
- `navigate()` - Navigate to page
- `clickAddFlashcard()` - Open create modal
- `createNewFlashcard(front, back)` - Complete flow to create flashcard
- `editFlashcard(index, front, back)` - Complete flow to edit flashcard
- `deleteFlashcard(index)` - Complete flow to delete flashcard
- `searchFlashcards(text)` - Search flashcards
- `getFlashcardCardByIndex(index)` - Get specific card
- `hasFlashcardWithText(text)` - Check if flashcard exists

## Components

### CreateFlashcardModal

Modal for creating new flashcards:

**Methods:**
- `waitForModal()` - Wait for modal to appear
- `fillFrontText(text)` - Fill front input
- `fillBackText(text)` - Fill back input
- `fillFlashcardData(front, back)` - Fill both inputs
- `clickSave()` - Save flashcard
- `clickCancel()` - Cancel creation
- `createFlashcard(front, back)` - Complete flow

### FlashcardCard

Individual flashcard card:

**Methods:**
- `flip()` - Click to flip card
- `clickEdit()` - Click edit button
- `clickDelete()` - Click delete button
- `getFlashcardId()` - Get card ID
- `containsText(text)` - Check if contains text

### FlashcardEditForm

Form for editing flashcards:

**Methods:**
- `waitForForm()` - Wait for form to appear
- `fillFrontText(text)` - Fill front input
- `fillBackText(text)` - Fill back input
- `clickSave()` - Save changes
- `clickCancel()` - Cancel editing
- `editFlashcard(front, back)` - Complete flow

### DeleteFlashcardModal

Confirmation modal for deletion:

**Methods:**
- `waitForModal()` - Wait for modal
- `clickConfirm()` - Confirm deletion
- `clickCancel()` - Cancel deletion
- `confirmDelete()` - Complete flow

### FiltersPanel

Panel for searching and filtering:

**Methods:**
- `search(text)` - Search flashcards
- `filterBySourceType(type)` - Filter by source type
- `sortBy(option)` - Sort flashcards
- `clearFilters()` - Clear all filters
- `applyFilters(options)` - Apply multiple filters

### Pagination

Pagination controls:

**Methods:**
- `changePageSize(size)` - Change items per page
- `goToNextPage()` - Next page
- `goToPreviousPage()` - Previous page
- `goToPage(number)` - Go to specific page
- `getTotalItemsCount()` - Get total items

## Best Practices

### 1. Use High-Level Methods

Prefer high-level methods that complete entire flows:

```typescript
// ✅ Good - Uses high-level method
await myCardsPage.createNewFlashcard("Front", "Back");

// ❌ Avoid - Too much implementation detail in test
await myCardsPage.clickAddFlashcard();
await myCardsPage.createModal.waitForModal();
await myCardsPage.createModal.fillFrontText("Front");
await myCardsPage.createModal.fillBackText("Back");
await myCardsPage.createModal.clickSave();
```

### 2. Access Components When Needed

Use component objects directly when testing specific component behavior:

```typescript
// Testing modal behavior specifically
test("should validate empty fields", async ({ page }) => {
  const myCardsPage = new MyCardsPage(page);
  await myCardsPage.navigate();
  await myCardsPage.clickAddFlashcard();
  
  // Component-specific test
  const isEnabled = await myCardsPage.createModal.isSaveButtonEnabled();
  expect(isEnabled).toBe(false);
});
```

### 3. Keep Tests DRY

Create helper functions in test files for common setups:

```typescript
async function createSampleFlashcards(myCardsPage: MyCardsPage, count: number) {
  for (let i = 1; i <= count; i++) {
    await myCardsPage.createNewFlashcard(`Q${i}`, `A${i}`);
  }
}

test("pagination test", async ({ page }) => {
  const myCardsPage = new MyCardsPage(page);
  await myCardsPage.navigate();
  await createSampleFlashcards(myCardsPage, 12);
  
  // Test pagination...
});
```

### 4. Use data-test-id Selectors

All selectors use `data-test-id` attributes for stability:

```typescript
// ✅ Good - Stable selector
this.button = page.locator('[data-test-id="add-button"]');

// ❌ Avoid - Fragile selectors
this.button = page.locator('.btn-primary');
this.button = page.getByText("Add");
```

### 5. Handle Async Properly

Always await async operations and use proper waits:

```typescript
// ✅ Good - Proper waiting
await modal.waitForModal();
await modal.clickSave();
await modal.waitForModalClose();

// ❌ Avoid - No waiting
modal.clickSave(); // Missing await
await page.waitForTimeout(1000); // Arbitrary timeout
```

## Updating Page Objects

When UI changes:

1. Update the relevant page object or component
2. Run tests to ensure they still pass
3. Tests should not need changes if page object is updated correctly

Example: If button text changes from "Add" to "Create":

```typescript
// Only update the page object
- <Button data-test-id="add-flashcard-button">Add</Button>
+ <Button data-test-id="add-flashcard-button">Create</Button>

// Tests remain unchanged because they use data-test-id
await myCardsPage.clickAddFlashcard(); // Still works
```

## Testing Tips

### Debugging

Use Playwright's debug mode to inspect page objects:

```bash
npx playwright test --debug
```

### Running Specific Tests

```bash
# Run all flashcard tests
npx playwright test flashcards.spec.ts

# Run specific test
npx playwright test flashcards.spec.ts -g "should create a flashcard"

# Run in headed mode
npx playwright test --headed
```

### Viewing Test Report

```bash
npx playwright show-report
```

