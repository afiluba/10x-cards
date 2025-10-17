import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Authentication credentials interface
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Login response from the API
 */
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Authenticates a user via API request
 * This is useful for setup scripts and utilities that need to authenticate
 * without using the UI
 *
 * @param request - Playwright APIRequestContext
 * @param baseURL - Base URL of the application
 * @param credentials - User credentials (email and password)
 * @returns Promise<LoginResponse> - The login response with user and session data
 *
 * @example
 * ```typescript
 * const loginData = await authenticateViaAPI(request, baseURL, {
 *   email: 'test@example.com',
 *   password: 'password123'
 * });
 * console.log('Logged in as:', loginData.user.email);
 * ```
 */
export async function authenticateViaAPI(
  request: APIRequestContext,
  baseURL: string | undefined,
  credentials: AuthCredentials
): Promise<LoginResponse> {
  const response = await request.post(`${baseURL}/api/auth/login`, {
    data: credentials,
  });

  // Verify successful authentication
  expect(response.ok(), `Authentication failed with status ${response.status()}`).toBeTruthy();

  const responseBody = await response.json();

  // Validate response structure
  expect(responseBody.user, "Response should contain user data").toBeDefined();
  expect(responseBody.session, "Response should contain session data").toBeDefined();
  expect(responseBody.session.access_token, "Session should contain access token").toBeDefined();

  return responseBody as LoginResponse;
}

/**
 * Registers a new user via API request
 * Useful for test setup when you need to create test users programmatically
 *
 * @param request - Playwright APIRequestContext
 * @param baseURL - Base URL of the application
 * @param credentials - User credentials (email and password)
 * @returns Promise with registration response
 *
 * @example
 * ```typescript
 * await registerViaAPI(request, baseURL, {
 *   email: 'newuser@example.com',
 *   password: 'password123'
 * });
 * ```
 */
export async function registerViaAPI(
  request: APIRequestContext,
  baseURL: string | undefined,
  credentials: AuthCredentials
): Promise<{ user: LoginResponse["user"]; message: string }> {
  const response = await request.post(`${baseURL}/api/auth/register`, {
    data: credentials,
  });

  expect(response.status(), "Registration should succeed").toBe(201);

  const responseBody = await response.json();
  expect(responseBody.user, "Response should contain user data").toBeDefined();

  return responseBody;
}

/**
 * Logs out the current user via API request
 *
 * @param request - Playwright APIRequestContext
 * @param baseURL - Base URL of the application
 *
 * @example
 * ```typescript
 * await logoutViaAPI(request, baseURL);
 * ```
 */
export async function logoutViaAPI(request: APIRequestContext, baseURL: string | undefined): Promise<void> {
  const response = await request.post(`${baseURL}/api/auth/logout`, {
    data: {},
  });

  expect(response.ok(), "Logout should succeed").toBeTruthy();
}

/**
 * Gets test credentials from environment variables
 * Throws an error if credentials are not set
 *
 * @returns AuthCredentials - Test user credentials
 * @throws Error if E2E_USERNAME or E2E_PASSWORD are not set
 *
 * @example
 * ```typescript
 * const credentials = getTestCredentials();
 * await authenticateViaAPI(request, baseURL, credentials);
 * ```
 */
export function getTestCredentials(): AuthCredentials {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_USERNAME and E2E_PASSWORD environment variables must be set. " +
        "Please create a .env.test file or set these variables in your environment."
    );
  }

  return { email, password };
}
