# Testing Guide - 10x Cards

This document explains how to run different types of tests in the 10x Cards project.

## Test Types

### 1. Unit Tests (`vitest`)
Unit tests focus on testing individual functions, components, and modules in isolation.

**Location:** `src/**/*.{test,spec}.{ts,tsx}`

**Run commands:**
```bash
# Run all unit tests once
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with coverage
npm run test:unit:coverage
```

**Coverage thresholds:**
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

### 2. Integration Tests (`vitest`)
Integration tests verify that different parts of the application work together correctly.

**Location:** `src/**/*.{integration,int-test}.{ts,tsx}`

**Run command:**
```bash
npm run test:integration
```

**Coverage thresholds:**
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### 3. End-to-End Tests (`playwright`)
E2E tests simulate real user interactions in a browser environment.

**Location:** `e2e/**/*.spec.ts`

**Run commands:**
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed
```

### 4. Run All Tests
```bash
npm run test:all
```

## Test Environment Setup

### Unit Tests
- Use `jsdom` environment for component testing
- All external dependencies are mocked
- No database or network calls

### Integration Tests
- Use `node` environment
- Connect to test database instance
- Test real service integrations
- **Note:** Requires running Supabase test instance

### E2E Tests
- Run against real browser (Chromium)
- Start development server automatically
- Test complete user workflows

## Writing Tests

### Unit Tests
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
import { describe, it, expect } from 'vitest';
import { testSupabase } from '@/test/integration-setup';

describe('API Integration', () => {
  it('should create and retrieve data', async () => {
    // Test real database operations
    const result = await someService(testSupabase, testData);
    expect(result).toBeValidDatabaseRecord();
  });
});
```

### E2E Tests
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL('/');
});
```

## Test Data Management

### Unit Tests
- Use mocked data and services
- No cleanup needed

### Integration Tests
- Use test database instance
- Automatic cleanup between tests
- Test data is isolated

### E2E Tests
- Use browser contexts for isolation
- Clean state between tests
- May need manual data seeding

## Best Practices

1. **Test filenames:** Use `.test.ts`, `.spec.ts`, `.integration.ts` extensions
2. **Test structure:** Arrange-Act-Assert pattern
3. **Mocking:** Mock external dependencies in unit tests
4. **Coverage:** Aim for high coverage on critical business logic
5. **Performance:** Keep tests fast and reliable
6. **CI/CD:** All tests run in CI pipeline

## Troubleshooting

### Common Issues

1. **Tests fail due to missing environment variables**
   - Ensure `.env.test` file exists with required variables

2. **Integration tests can't connect to database**
   - Start Supabase test instance
   - Check `SUPABASE_TEST_URL` and `SUPABASE_TEST_ANON_KEY`

3. **E2E tests timeout**
   - Increase timeout in `playwright.config.ts`
   - Check if dev server starts correctly

4. **Coverage reports are inaccurate**
   - Ensure all source files are included in coverage configuration
   - Check `vitest.config.ts` coverage settings

## Continuous Integration

Tests are automatically run in CI/CD pipeline:
- Unit tests on every push
- Integration tests on pull requests
- E2E tests on main branch and releases

See `package.json` scripts and GitHub Actions workflows for details.
