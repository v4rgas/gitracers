import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtected =
    req.nextUrl.pathname.startsWith("/repos") ||
    req.nextUrl.pathname.startsWith("/race");

  if (isProtected && !isLoggedIn) {
    return Response.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/repos/:path*", "/race/:path*"],
};
