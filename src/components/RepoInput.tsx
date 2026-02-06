"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RepoInput() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    const match = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (match) {
      router.push(`/race/${match[1]}/${match[2]}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="owner/repo"
        className="flex-1 border-b-2 border-ink/15 bg-transparent px-1 py-2 font-body text-ink placeholder-ink-muted/40 transition-colors focus:border-racing-red focus:outline-none"
      />
      <button
        type="submit"
        className="cursor-pointer bg-racing-red px-6 py-2 font-ui text-sm font-bold uppercase tracking-[0.15em] text-cream transition-colors hover:bg-racing-red-dark"
      >
        Race!
      </button>
    </form>
  );
}
