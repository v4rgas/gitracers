import { auth } from "@/auth";
import { getMostViewedRaces } from "@/actions/commits";
import { SignInButton } from "@/components/SignInButton";
import { TrackPreview } from "@/components/TrackPreview";
import { RepoInput } from "@/components/RepoInput";
import Link from "next/link";

export default async function Home() {
  const [session, topRaces] = await Promise.all([
    auth(),
    getMostViewedRaces(),
  ]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const issueNo =
    Math.floor(
      (today.getTime() - new Date("2026-01-01").getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  return (
    <div className="min-h-screen bg-cream">
      {/* Racing stripe */}
      <div className="h-1 bg-racing-red" />

      {/* ═══════════════════════════════
          MASTHEAD
          ═══════════════════════════════ */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-2">
        {/* Top double rule */}
        <div className="border-t-[3px] border-ink" />
        <div className="mt-[3px] border-t border-ink/50" />

        {/* Edition info */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0 py-2.5">
          <span className="font-ui text-xs font-medium uppercase tracking-[0.25em] text-ink-muted">
            Vol. I
          </span>
          <span className="text-xs text-ink-muted/40">&middot;</span>
          <span className="font-ui text-xs font-medium uppercase tracking-[0.25em] text-ink-muted">
            No. {issueNo}
          </span>
          <span className="text-xs text-ink-muted/40">&middot;</span>
          <span className="font-ui text-xs font-medium uppercase tracking-[0.25em] text-ink-muted">
            {dateStr}
          </span>
          <span className="hidden text-xs text-ink-muted/40 sm:inline">
            &middot;
          </span>
          <span className="hidden font-ui text-xs font-medium uppercase tracking-[0.25em] text-ink-muted sm:inline">
            Free Edition
          </span>
        </div>

        {/* Thin separator */}
        <div className="border-t border-ink/15" />

        {/* Title block */}
        <div className="py-6 md:py-8">
          <div className="mb-2 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-ink/25" />
            <span className="font-body text-sm text-ink-muted">&diams;</span>
            <div className="h-px w-12 bg-ink/25" />
          </div>

          <h1 className="text-center font-heading font-black italic leading-[0.88] tracking-tight">
            <span className="block text-[3.5rem] text-ink md:text-[5.5rem]">
              The Grand
            </span>
            <span className="block text-[4.5rem] text-racing-red md:text-[7.5rem]">
              Git Races
            </span>
          </h1>

          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-ink/25" />
            <span className="font-body text-sm text-ink-muted">&diams;</span>
            <div className="h-px w-12 bg-ink/25" />
          </div>

          <p className="mt-3 text-center font-ui text-xs font-semibold uppercase tracking-[0.35em] text-ink-muted">
            The Definitive Commit Championship
          </p>
        </div>

        {/* Bottom double rule */}
        <div className="border-t border-ink/50" />
        <div className="mt-[3px] border-t-[3px] border-ink" />
      </header>

      {/* ═══════════════════════════════
          THREE-COLUMN LAYOUT
          ═══════════════════════════════ */}
      <main className="mx-auto mt-8 grid max-w-6xl gap-10 px-4 lg:grid-cols-[220px_1fr_220px] lg:gap-0">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="order-2 lg:order-1 lg:border-r lg:border-rule lg:pr-6">
          {/* Section header */}
          <div className="mb-5 flex items-center gap-2">
            <div className="h-px flex-1 bg-ink/15" />
            <h2 className="whitespace-nowrap font-ui text-xs font-bold uppercase tracking-[0.3em] text-ink-muted">
              Latest Dispatches
            </h2>
            <div className="h-px flex-1 bg-ink/15" />
          </div>

          {topRaces.length > 0 ? (
            <div className="space-y-3">
              {topRaces.slice(0, 6).map(({ owner, repo, view_count }) => {
                const inner = (
                  <>
                    <span className="font-body text-sm text-racing-red">
                      &#9656;
                    </span>
                    <span className="font-body text-sm text-ink transition-colors group-hover:text-racing-red">
                      {owner}
                      <span className="text-ink-muted/50">/</span>
                      {repo}
                    </span>
                    <span className="mb-0.5 flex-1 border-b border-dotted border-ink-muted/30" />
                    <span className="font-ui text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      {view_count}
                    </span>
                  </>
                );
                return (
                  <Link
                    key={`dispatch-${owner}/${repo}`}
                    href={`/race/${owner}/${repo}`}
                    className="group flex items-baseline gap-1 transition-colors"
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="font-body text-sm italic text-ink-muted">
              No dispatches yet. Be the first to race!
            </p>
          )}

          {/* Scoring classified ad */}
          <div className="mt-8 border-2 border-ink p-[3px]">
            <div className="border border-ink/50 px-4 py-4 text-center">
              <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-ink">
                &#9733; Scoring System &#9733;
              </p>
              <div className="my-2 h-px bg-ink/15" />
              <p className="font-body text-sm leading-relaxed text-ink-light">
                Each commit earns
              </p>
              <p className="font-heading text-xl font-bold italic text-racing-red">
                1 + log&#8322;(lines)
              </p>
              <p className="font-body text-sm leading-relaxed text-ink-light">
                points. More changes,
                <br />
                faster you race!
              </p>
            </div>
          </div>

          {/* Racing conditions */}
          <div className="mt-6 text-center">
            <p className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-ink">
              Racing Conditions
            </p>
            <div className="mx-auto mt-1.5 h-px w-8 bg-ink/15" />
            <div className="mt-2 space-y-0.5 font-body text-[13px] text-ink-light">
              <p>Track: Procedural</p>
              <p>Surface: Digital Asphalt</p>
              <p>Conditions: Optimal</p>
            </div>
          </div>
        </aside>

        {/* ── MAIN COLUMN ── */}
        <article className="order-1 lg:order-2 lg:px-8">
          {/* Lead headline */}
          <div className="mb-5 border-b-[3px] border-ink pb-4">
            <h2 className="font-heading text-3xl font-black leading-tight tracking-tight text-ink md:text-4xl lg:text-[2.7rem]">
              Contributors Take to the Track in Spectacular Commit Championship
            </h2>
            <p className="mt-2 font-ui text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
              By Our Racing Correspondent
            </p>
          </div>

          {/* Body text — two columns on md+ */}
          <div className="columns-1 gap-6 md:columns-2">
            <p className="np-drop-cap mb-4 font-body text-[1.05rem] leading-[1.7] text-ink-light">
              Pick a repository &mdash; any repository &mdash; and watch as its
              contributors race around a procedurally generated circuit. Each
              developer is propelled forward by their commit history: the more
              impactful the contributions, the faster they fly around the track.
            </p>
            <p className="mb-4 font-body text-[1.05rem] leading-[1.7] text-ink-light">
              Live timing towers display the standings in real time whilst a
              commit ticker reveals each contribution as it powers its author
              forward. Record the whole affair on video to share with
              colleagues, or simply sit back and enjoy the spectacle of open
              source at full speed.
            </p>
          </div>

          {/* CTA Block — framed like a newspaper advertisement */}
          <div className="my-8 flex justify-center">
            <div className="border-2 border-ink p-[3px]">
              <div className="border border-ink/50 px-10 py-6 text-center">
                <p className="mb-3 font-ui text-[11px] font-semibold uppercase tracking-[0.35em] text-ink-muted">
                  Your presence is requested at the races
                </p>
                {session ? (
                  <Link
                    href="/repos"
                    className="inline-block border-2 border-racing-red bg-racing-red px-10 py-3.5 font-ui text-sm font-bold uppercase tracking-[0.2em] text-cream transition-all hover:bg-transparent hover:text-racing-red"
                  >
                    Enter the Race
                  </Link>
                ) : (
                  <SignInButton />
                )}
              </div>
            </div>
          </div>

          {/* Featured track illustration */}
          {topRaces.length > 0 && (
            <div className="my-8">
              <div className="overflow-hidden border border-ink/20">
                <div className="np-photo">
                  <TrackPreview
                    seed={`${topRaces[0].owner}/${topRaces[0].repo}`}
                  />
                </div>
              </div>
              <p className="mt-2 text-center font-ui text-xs italic tracking-wide text-ink-muted">
                Fig. 1 &mdash; The circuit at {topRaces[0].owner}/
                {topRaces[0].repo}
              </p>
            </div>
          )}

          {/* Manual repo entry */}
          {session ? (
            <div className="mt-8 border-t border-ink/15 pt-5">
              <p className="mb-3 font-ui text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">
                Or enter any public repository
              </p>
              <RepoInput />
            </div>
          ) : (
            <div className="mt-8 border-t border-ink/15 pt-5">
              <p className="font-body text-sm italic text-ink-muted">
                Sign in with GitHub to race any repository.
              </p>
            </div>
          )}
        </article>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="order-3 lg:border-l lg:border-rule lg:pl-6">
          {/* Section header */}
          <div className="mb-5 flex items-center gap-2">
            <div className="h-px flex-1 bg-ink/15" />
            <h2 className="whitespace-nowrap font-ui text-xs font-bold uppercase tracking-[0.3em] text-ink-muted">
              Race Features
            </h2>
            <div className="h-px flex-1 bg-ink/15" />
          </div>

          <div className="space-y-4">
            {[
              {
                title: "Live Timing Tower",
                desc: "Follow the top ten standings as positions shift with every commit.",
              },
              {
                title: "Video Export",
                desc: "Record your race in high quality and share it with the world.",
              },
              {
                title: "Commit Ticker",
                desc: "Watch each commit flash across the screen as racers surge ahead.",
              },
              {
                title: "Playback Control",
                desc: "Pause, rewind, and speed up. Race at 0.5\u00d7 to 4\u00d7 speed.",
              },
            ].map(({ title, desc }) => (
              <div key={title} className="border-b border-ink/10 pb-3">
                <p className="font-ui text-sm font-bold uppercase tracking-[0.1em] text-ink">
                  {title}
                </p>
                <p className="mt-1 font-body text-sm leading-snug text-ink-light">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* Notice classified ad */}
          <div className="mt-6 border-2 border-ink p-[3px]">
            <div className="border border-ink/50 px-4 py-4 text-center">
              <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-ink">
                &#9733; Notice &#9733;
              </p>
              <div className="my-2 h-px bg-ink/15" />
              <p className="font-body text-sm leading-relaxed text-ink-light">
                Up to <strong>5,000 commits</strong> analysed per race. Merge
                commits excluded.
              </p>
              <p className="mt-2 font-body text-sm italic text-ink-muted">
                Fair racing guaranteed.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-6 border-t border-ink/15 pt-4">
            <p className="mb-2 font-ui text-xs font-bold uppercase tracking-[0.2em] text-ink">
              How It Works
            </p>
            <ol className="list-inside list-decimal space-y-1.5 font-body text-sm leading-snug text-ink-light">
              <li>Pick any GitHub repository</li>
              <li>We fetch the commit history</li>
              <li>Each commit is scored by impact</li>
              <li>Contributors race a unique track</li>
              <li>The most prolific dev wins!</li>
            </ol>
          </div>
        </aside>
      </main>

      {/* ═══════════════════════════════
          RACE PROGRAMME (below the fold)
          ═══════════════════════════════ */}
      {topRaces.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4 pb-12">
          {/* Programme header */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex-1 border-t-2 border-ink/15" />
            <h3 className="font-heading text-xl font-black italic tracking-tight text-ink md:text-2xl">
              {"Today\u2019s Race Programme"}
            </h3>
            <span className="font-ui text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
              Public repositories only
            </span>
            <div className="flex-1 border-t-2 border-ink/15" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topRaces.map(({ owner, repo, view_count }) => {
              const card = (
                <>
                  <div className="np-photo">
                    <TrackPreview seed={`${owner}/${repo}`} />
                  </div>
                  <div className="border-t border-ink/10 px-4 py-3">
                    <p className="font-heading text-lg font-bold tracking-tight text-ink transition-colors group-hover:text-racing-red">
                      {owner}
                      <span className="text-ink-muted/40">/</span>
                      {repo}
                    </p>
                    <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                      {view_count.toLocaleString()}{" "}
                      {view_count === 1 ? "view" : "views"}
                      {" "}&middot; View Race &rarr;
                    </p>
                  </div>
                </>
              );
              return (
                <Link
                  key={`programme-${owner}/${repo}`}
                  href={`/race/${owner}/${repo}`}
                  className="group overflow-hidden border-2 border-ink/10 transition-all hover:border-racing-red/50"
                >
                  {card}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════
          FOOTER / COLOPHON
          ═══════════════════════════════ */}
      <footer className="mx-auto mt-8 max-w-6xl px-4 pb-10">
        <div className="border-t border-ink/15" />
        <div className="mt-[3px] border-t-[3px] border-ink/30" />
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="h-6 w-px bg-ink/15" />
          <p className="mt-2 font-ui text-[11px] font-medium uppercase tracking-[0.3em] text-ink-muted">
            Published by GitRacers &middot; Printed on the finest pixels
            &middot; Est. MMXXVI
          </p>
          <p className="mt-1 font-body text-xs italic text-ink-muted/60">
            Powered by GitHub commit history &middot; All races generated in
            real time &middot; Private repositories are never listed or shared
          </p>
          <p className="mt-2 font-body text-xs text-ink-muted/60">
            Built with love by{" "}
            <a
              href="https://v4rgas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-racing-red"
            >
              v4rgas
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
