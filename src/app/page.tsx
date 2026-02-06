import { auth } from "@/auth";
import { SignInButton } from "@/components/SignInButton";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/repos");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-cream px-4">
      {/* Top racing stripe */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-racing-red" />

      <div
        className="text-center"
        style={{ animation: "fade-up 0.8s ease-out both" }}
      >
        {/* Masthead rule */}
        <div className="mb-6 inline-block">
          <div className="border-t-[3px] border-b border-b-ink/15 border-t-ink/30 px-6 py-1.5">
            <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.35em] text-ink-muted">
              The Definitive Commit Championship
            </p>
          </div>
        </div>

        <h1 className="font-heading text-[6rem] font-black leading-[0.9] tracking-tight text-ink md:text-[9rem]">
          <span className="italic">Git</span>
          <span className="italic text-racing-red">Racers</span>
        </h1>

        <div
          className="mx-auto mt-8 max-w-md border-t border-ink/15 pt-5"
          style={{ animation: "fade-up 0.8s ease-out 0.15s both" }}
        >
          <p className="font-body text-lg leading-relaxed text-ink-light">
            Pick a repository. Watch its contributors race around a track,
            powered by their commit history.
          </p>
        </div>

        <div
          style={{ animation: "fade-up 0.8s ease-out 0.3s both" }}
          className="mt-10"
        >
          <SignInButton />
        </div>
      </div>

      {/* Bottom mark */}
      <div
        className="absolute bottom-8 flex flex-col items-center"
        style={{ animation: "fade-in 1s ease-out 0.6s both" }}
      >
        <div className="h-8 w-px bg-ink/15" />
        <p className="mt-2 font-ui text-[9px] font-medium uppercase tracking-[0.25em] text-ink-muted">
          Est. 2025
        </p>
      </div>
    </div>
  );
}
