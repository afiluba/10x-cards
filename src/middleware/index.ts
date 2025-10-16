import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client";

// Public paths - exact matches only (no startsWith to avoid false positives)
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/reset-password",
  "/api/auth/update-password",
  // Public assets and API
  "/",
  "/favicon.ico",
  "/robots.txt",
  // Static assets
  ...(process.env.NODE_ENV === "development" ? ["/_astro/"] : []),
];

function requiresAuth(pathname: string): boolean {
  // Skip auth check for exact public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    // eslint-disable-next-line no-console
    console.log(`🔓 Public path: ${pathname}`);
    return false;
  }

  // Skip auth check for API routes that handle their own auth
  if (pathname.startsWith("/api/")) {
    return false;
  }

  // All other paths require authentication
  // eslint-disable-next-line no-console
  console.log(`🔒 Requires auth: ${pathname}`);
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  // eslint-disable-next-line no-console
  console.log(`🌐 Request: ${context.url.pathname} (${context.request.method})`);

  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  context.locals.supabase = supabase;

  // Check if this path requires authentication
  if (requiresAuth(context.url.pathname)) {
    // eslint-disable-next-line no-console
    console.log(`🔒 Protected path detected: ${context.url.pathname}`);
    // IMPORTANT: Always get user session first before any other operations
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // eslint-disable-next-line no-console
      console.log(`✅ User authenticated: ${user.email}`);
      context.locals.user = {
        email: user.email!,
        id: user.id,
        created_at: user.created_at,
      };
    } else {
      // eslint-disable-next-line no-console
      console.log(`❌ User not authenticated, redirecting to login`);
      // Redirect to login for protected routes
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(context.url.pathname)}`;
      return context.redirect(redirectUrl);
    }
  }

  return next();
});
