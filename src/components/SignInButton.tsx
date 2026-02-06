"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("github", { redirectTo: "/repos" })}
      className="cursor-pointer border-2 border-ink bg-ink px-8 py-3.5 font-ui text-sm font-bold uppercase tracking-[0.18em] text-cream transition-all hover:bg-transparent hover:text-ink"
    >
      Sign in with GitHub
    </button>
  );
}
