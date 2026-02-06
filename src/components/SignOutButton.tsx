"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/" })}
      className="cursor-pointer font-ui text-xs font-medium uppercase tracking-[0.15em] text-ink-muted underline-offset-4 transition-colors hover:text-racing-red hover:underline"
    >
      Sign out
    </button>
  );
}
