import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API, admin, Next internals, and files with a dot
  matcher: [
    "/",
    "/(zh|en|es|pt|ja|id|hi|ko|de|fr|ru|ar|tr|th|vi)/:path*",
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
