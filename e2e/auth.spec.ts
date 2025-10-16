import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should allow user to register", async ({ page }) => {
    // Navigate to register page
    await page.goto("/auth/register");

    // Fill registration form
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");

    // Submit form
    await page.getByRole("button", { name: "Register" }).click();

    // Verify redirect to dashboard
    await expect(page).toHaveURL("/");
  });

  test("should allow user to login", async ({ page }) => {
    // Navigate to login page
    await page.goto("/auth/login");

    // Fill login form
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");

    // Submit form
    await page.getByRole("button", { name: "Login" }).click();

    // Verify redirect to dashboard
    await expect(page).toHaveURL("/");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Navigate to login page
    await page.goto("/auth/login");

    // Fill login form with invalid credentials
    await page.getByLabel("Email").fill("invalid@example.com");
    await page.getByLabel("Password").fill("wrongpassword");

    // Submit form
    await page.getByRole("button", { name: "Login" }).click();

    // Verify error message is shown
    await expect(page.getByText("Invalid login credentials")).toBeVisible();
  });
});
