import { test, expect } from "@playwright/test";
import { LoginPage, RegisterPage } from "./pages";

// Get test credentials from environment variables
const TEST_EMAIL = process.env.E2E_USERNAME || "test@example.com";
const TEST_PASSWORD = process.env.E2E_PASSWORD || "password123";

test.describe("Authentication", () => {
  test.describe("Registration", () => {
    let registerPage: RegisterPage;

    test.beforeEach(async ({ page }) => {
      registerPage = new RegisterPage(page);
      await registerPage.navigate();
    });

    test("should display registration form", async () => {
      // Verify form is visible
      expect(await registerPage.registerForm.isVisible()).toBe(true);

      // Verify submit button exists
      expect(await registerPage.registerForm.isSubmitButtonEnabled()).toBe(true);
    });

    test("should navigate to login page via link", async () => {
      await registerPage.goToLogin();
      await expect(registerPage.page).toHaveURL("/auth/login");
    });

    test("should fill registration form fields", async () => {
      // Fill form fields using environment variables
      await registerPage.registerForm.fillEmail(TEST_EMAIL);
      await registerPage.registerForm.fillPassword(TEST_PASSWORD);
      await registerPage.registerForm.fillConfirmPassword(TEST_PASSWORD);

      // Click the terms checkbox
      await registerPage.registerForm.setAcceptTerms(true);

      // Verify form is still visible (fields were filled successfully)
      expect(await registerPage.registerForm.isVisible()).toBe(true);
    });
  });

  test.describe("Login", () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
      loginPage = new LoginPage(page);
      await loginPage.navigate();
    });

    test("should display login form", async () => {
      // Verify form is visible
      expect(await loginPage.loginForm.isVisible()).toBe(true);

      // Verify submit button exists
      expect(await loginPage.loginForm.isSubmitButtonEnabled()).toBe(true);
    });

    test("should fill login form fields", async () => {
      // Fill form fields using environment variables
      await loginPage.loginForm.fillEmail(TEST_EMAIL);
      await loginPage.loginForm.fillPassword(TEST_PASSWORD);

      // Verify form is still visible (no submission yet)
      expect(await loginPage.loginForm.isVisible()).toBe(true);
    });

    test("should successfully login with valid credentials", async () => {
      // Fill and submit login form with valid credentials from environment
      await loginPage.login(TEST_EMAIL, TEST_PASSWORD);

      // Wait for successful login and redirect to home page
      await loginPage.waitForSuccessfulLogin();

      // Verify we're on the home page
      await expect(loginPage.page).toHaveURL("/");

      // Verify user avatar is visible in navbar
      expect(await loginPage.isUserAvatarVisible()).toBe(true);
    });

    test("should navigate to register page via link", async () => {
      await loginPage.goToRegister();
      await expect(loginPage.page).toHaveURL("/auth/register");
    });

    test("should navigate to forgot password page via link", async () => {
      await loginPage.goToForgotPassword();
      await expect(loginPage.page).toHaveURL("/auth/reset-password");
    });

    test("should have accessible forgot password link", async () => {
      await loginPage.loginForm.clickForgotPassword();
      await expect(loginPage.page).toHaveURL("/auth/reset-password");
    });
  });
});
