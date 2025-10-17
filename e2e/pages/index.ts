/**
 * Page Objects and Components exports
 * 
 * This file provides a centralized export for all page objects and components
 * following the Page Object Model (POM) pattern for Playwright tests.
 */

// Base page
export { BasePage } from "./base.page";

// Pages
export { MyCardsPage } from "./my-cards.page";
export { LoginPage } from "./login.page";
export { RegisterPage } from "./register.page";

// Components
export { CreateFlashcardModal } from "./components/create-flashcard-modal.component";
export { FlashcardCard, FlashcardEditForm } from "./components/flashcard-card.component";
export { FiltersPanel } from "./components/filters-panel.component";
export { DeleteFlashcardModal } from "./components/delete-flashcard-modal.component";
export { Pagination } from "./components/pagination.component";
export { LoginFormComponent } from "./components/login-form.component";
export { RegisterFormComponent } from "./components/register-form.component";

