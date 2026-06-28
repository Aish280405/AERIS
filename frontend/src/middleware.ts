import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Protect all routes except login, signup, and API auth routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login
     * - /signup
     * - /api/auth (NextAuth routes)
     * - /_next (static files)
     * - /favicon.ico, /public files
     */
    "/((?!login|signup|api/auth|_next|favicon.ico|.*\\..*$).*)",
  ],
};
