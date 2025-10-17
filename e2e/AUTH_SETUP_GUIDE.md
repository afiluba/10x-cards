# E2E Authentication Setup Guide

This guide explains the generic authentication mechanism for e2e testing using Playwright's API request approach.

## Overview

The authentication mechanism is based on Playwright's recommended approach for [shared authentication](https://playwright.dev/docs/auth#basic-shared-account-in-all-tests) using API requests. This provides:

- **Fast test execution**: Authenticate once, reuse across all tests
- **Reliable**: Uses API instead of UI, reducing flakiness
- **Maintainable**: Centralized authentication logic
- **Flexible**: Easy to support multiple user types or roles

## Architecture

### Components

```
e2e/
├── auth.setup.ts              # Setup project that authenticates and saves state
├── utils/
│   └── auth.utils.ts          # Authentication utility functions
└── .auth/
    └── user.json              # Saved authentication state (gitignored)
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Test Execution Starts                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Setup Project Runs (auth.setup.ts)                        │
│    - Reads E2E_USERNAME and E2E_PASSWORD from env            │
│    - Makes POST /api/auth/login request                      │
│    - Validates response                                       │
│    - Saves cookies/storage to .auth/user.json                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Test Projects Run                                         │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ chromium (authenticated)                            │  │
│    │ - Loads .auth/user.json                             │  │
│    │ - All tests start with user logged in              │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ chromium-unauthenticated                            │  │
│    │ - No auth state loaded                              │  │
│    │ - Tests for login/register flows                    │  │
│    └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Files Created

### 1. `e2e/auth.setup.ts`

**Purpose**: Setup project that authenticates once before all tests.

**What it does**:
- Runs as a Playwright setup project
- Authenticates via POST `/api/auth/login` API call
- Saves authentication state to `.auth/user.json`
- Validates response to ensure successful authentication

**Key code**:
```typescript
setup("authenticate", async ({ request, baseURL }) => {
  const response = await request.post(`${baseURL}/api/auth/login`, {
    data: { email, password }
  });
  await request.storageState({ path: STORAGE_STATE_PATH });
});
```

### 2. `e2e/utils/auth.utils.ts`

**Purpose**: Reusable authentication utility functions.

**Exported functions**:

| Function | Purpose | Usage |
|----------|---------|-------|
| `authenticateViaAPI()` | Login via API request | Setup scripts, custom auth flows |
| `registerViaAPI()` | Register new user via API | Test data setup |
| `logoutViaAPI()` | Logout via API | Cleanup, session tests |
| `getTestCredentials()` | Get credentials from env | Convenience helper |

**Example usage**:
```typescript
import { authenticateViaAPI, getTestCredentials } from "./utils/auth.utils";

test("custom auth", async ({ request, baseURL }) => {
  const credentials = getTestCredentials();
  const loginData = await authenticateViaAPI(request, baseURL, credentials);
  console.log("Logged in as:", loginData.user.email);
});
```

### 3. Updated `playwright.config.ts`

**Changes made**:
- Added "setup" project that runs `auth.setup.ts`
- Configured "chromium" project to use saved auth state
- Added "chromium-unauthenticated" project for login/register tests
- Set up project dependencies to ensure setup runs first

**Project configuration**:
```typescript
projects: [
  {
    name: "setup",
    testMatch: /auth\.setup\.ts/,
  },
  {
    name: "chromium",
    use: {
      storageState: ".auth/user.json", // Uses saved auth
    },
    dependencies: ["setup"], // Runs after setup
  },
  {
    name: "chromium-unauthenticated",
    testMatch: /auth\.spec\.ts/, // Only login/register tests
  },
]
```

### 4. `.auth/` Directory

**Purpose**: Stores authentication state file.

**Contents**:
- `.gitkeep` - Ensures directory exists in git
- `user.json` - Generated auth state (gitignored)

**Security**: The directory is added to `.gitignore` to prevent committing sensitive session data.

## Usage

### Setup Required

1. **Create `.env.test` file** in project root:
```env
E2E_USERNAME=test@example.com
E2E_PASSWORD=password123
BASE_URL=http://localhost:4321
```

2. **Ensure test user exists** in your test database with the credentials above.

### Running Tests

#### All tests (with authentication)
```bash
npm run test:e2e
```

This will:
1. Run setup project → authenticates and saves state
2. Run chromium project → tests start authenticated
3. Run chromium-unauthenticated project → tests for auth flows

#### Only authenticated tests
```bash
npx playwright test --project=chromium
```

#### Only unauthenticated tests (login/register)
```bash
npx playwright test --project=chromium-unauthenticated
```

#### Force re-authentication
```bash
rm .auth/user.json && npm run test:e2e
```

### Writing Tests

#### Authenticated Tests (Default)

Tests in the `chromium` project automatically start authenticated:

```typescript
import { test, expect } from "@playwright/test";

test("should access protected page", async ({ page }) => {
  // User is already logged in!
  await page.goto("/my-cards");
  
  // Verify protected content is accessible
  await expect(page.locator("[data-testid='flashcards-grid']")).toBeVisible();
});
```

**No login needed!** The test starts with the user already authenticated.

#### Unauthenticated Tests

For testing login/register flows, use the unauthenticated project or clear state:

```typescript
// Option 1: Put in auth.spec.ts (uses chromium-unauthenticated project)
test("should login successfully", async ({ page }) => {
  await page.goto("/auth/login");
  // Test login flow
});

// Option 2: Clear auth state in any test
test.use({ storageState: { cookies: [], origins: [] } });

test("should register new user", async ({ page }) => {
  await page.goto("/auth/register");
  // Test registration flow
});
```

#### Using Auth Utilities

For advanced scenarios, use the utility functions:

```typescript
import { test } from "@playwright/test";
import { authenticateViaAPI, logoutViaAPI } from "./utils/auth.utils";

test("should handle session expiry", async ({ request, baseURL, page }) => {
  // Logout to simulate session expiry
  await logoutViaAPI(request, baseURL);
  
  // Try to access protected page
  await page.goto("/my-cards");
  
  // Should redirect to login
  await expect(page).toHaveURL("/auth/login");
  
  // Re-authenticate
  const credentials = { email: "test@example.com", password: "password123" };
  await authenticateViaAPI(request, baseURL, credentials);
});
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `E2E_USERNAME` | Yes | - | Test user email |
| `E2E_PASSWORD` | Yes | - | Test user password |
| `BASE_URL` | No | `http://localhost:4321` | Application URL |

### Customization

#### Multiple User Types

To support different user roles (admin, regular user, etc.), create separate setup files:

```typescript
// e2e/auth.admin.setup.ts
setup("authenticate as admin", async ({ request, baseURL }) => {
  // Authenticate as admin user
  await request.storageState({ 
    path: path.join(__dirname, "..", ".auth", "admin.json") 
  });
});

// playwright.config.ts
projects: [
  { name: "setup-admin", testMatch: /auth\.admin\.setup\.ts/ },
  {
    name: "chromium-admin",
    use: { storageState: ".auth/admin.json" },
    dependencies: ["setup-admin"],
  },
]
```

#### Different Environments

Configure different auth endpoints per environment:

```typescript
// .env.test
BASE_URL=http://localhost:4321

// .env.staging
BASE_URL=https://staging.example.com

// .env.production
BASE_URL=https://production.example.com
```

## Troubleshooting

### Authentication Fails

**Problem**: Setup project fails with authentication error.

**Solutions**:
1. Check `.env.test` file exists and has correct credentials
2. Verify test user exists in database
3. Ensure dev server is running
4. Check API endpoint `/api/auth/login` is accessible

```bash
# Test API endpoint manually
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### State File Not Found

**Problem**: Tests fail with "storage state file not found".

**Solutions**:
1. Ensure setup project runs first (check dependencies in config)
2. Verify `.auth` directory exists
3. Delete `.auth/user.json` and re-run tests

```bash
rm -rf .auth && npm run test:e2e
```

### Tests Still Login via UI

**Problem**: Tests are still going through login UI.

**Solutions**:
1. Verify project has `dependencies: ["setup"]` in config
2. Check `storageState` is set in project config
3. Ensure test file is not matched by unauthenticated project

### Session Expires During Tests

**Problem**: Tests fail midway with authentication errors.

**Solutions**:
1. Increase session timeout in your auth configuration
2. Use `beforeEach` to refresh session if needed
3. Re-authenticate in the middle of long test suites

## Best Practices

### ✅ Do

- Use API authentication for all non-auth-flow tests
- Keep authentication credentials in environment variables
- Test login/register flows with unauthenticated project
- Delete `.auth/user.json` to force re-authentication when needed
- Use utility functions for custom auth scenarios

### ❌ Don't

- Commit `.auth/user.json` to git
- Hardcode credentials in test files
- Use UI login in every test (slow and flaky)
- Mix authenticated and unauthenticated tests in same file
- Forget to add new auth state files to `.gitignore`

## Migration Guide

### From UI-based Authentication

If you currently login via UI in `beforeEach`:

**Before**:
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill("#email", "test@example.com");
  await page.fill("#password", "password123");
  await page.click("#submit");
  await page.waitForURL("/");
});
```

**After**:
```typescript
// No beforeEach needed! Just use the test
test("should do something", async ({ page }) => {
  // Already authenticated
  await page.goto("/my-page");
});
```

### Updating Existing Tests

1. Remove UI login from `beforeEach` hooks
2. Move auth-flow tests to `auth.spec.ts`
3. Update other tests to rely on saved auth state
4. Test and verify all tests still pass

## Additional Resources

- [Playwright Authentication Docs](https://playwright.dev/docs/auth)
- [API Testing with Playwright](https://playwright.dev/docs/api-testing)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Global Setup and Teardown](https://playwright.dev/docs/test-global-setup-teardown)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Playwright's authentication documentation
3. Examine the setup logs for detailed error messages
4. Verify your environment configuration

## Summary

This authentication mechanism provides:
- ⚡ **Fast**: Authenticate once, not per test
- 🎯 **Reliable**: API-based, no UI flakiness  
- 🔒 **Secure**: Credentials in env vars, state gitignored
- 🔧 **Flexible**: Easy to extend for multiple users/roles
- 📦 **Complete**: Ready to use, fully documented

The setup is complete and ready to use. Simply ensure your `.env.test` file is configured, and start writing tests!

