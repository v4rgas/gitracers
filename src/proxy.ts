import { auth } from "@/auth";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;

  // Only /repos requires auth — /race is open for published races
  if (req.nextUrl.pathname.startsWith("/repos") && !isLoggedIn) {
    return Response.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/repos/:path*"],
};
