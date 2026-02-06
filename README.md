# GitRacers

**Watch your repository's contributors race around a track, powered by their commit history.**

GitRacers turns any GitHub repository into an animated race. Each contributor is a racer whose speed is determined by their commits. More impactful commits mean faster lap times. Sign in with GitHub, pick a repo, and watch the race unfold.

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router, Server Actions)
- [React](https://react.dev/) 19 with React Compiler
- [Tailwind CSS](https://tailwindcss.com/) 4
- [NextAuth.js](https://authjs.dev/) v5 (GitHub OAuth)
- [Octokit](https://github.com/octokit/rest.js) (GitHub API / GraphQL)
- HTML Canvas for real-time rendering

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- A [GitHub OAuth App](https://github.com/settings/developers) with the callback URL set to `http://localhost:3000/api/auth/callback/github`

### Setup

```bash
git clone https://github.com/your-username/gitracers.git
cd gitracers
pnpm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables in `.env.local`:

| Variable             | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `AUTH_SECRET`        | Random secret for NextAuth (`openssl rand -base64 33`) |
| `AUTH_GITHUB_ID`     | OAuth App Client ID                                  |
| `AUTH_GITHUB_SECRET` | OAuth App Client Secret                              |

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Fetch commits**: Up to 5,000 commits are pulled from the repository's default branch via the GitHub GraphQL API. Merge commits are excluded.

2. **Score commits**: Each commit is scored using a logarithmic formula based on lines changed: `1 + log2(linesChanged)`. This rewards consistent contributors without letting a single massive commit dominate.

3. **Build race frames**: The race engine replays commits chronologically, accumulating scores per contributor. Each frame maps every contributor to a track position combining a base time progression (40%) with a score-based boost (60%).

4. **Generate a track**: A unique procedural track is generated for each repository using a seeded PRNG. Random points are turned into a convex hull, displaced, smoothed with Catmull-Rom splines, and rendered on a canvas.

5. **Animate**: Racer avatars are drawn on the canvas and smoothly interpolated toward their target positions each frame. A live timing tower shows the top 10 standings in real time, and a commit ticker displays each commit as it plays.

6. **Export**: Races can be exported as video directly from the browser using the MediaRecorder API.

## License

[WTFPL](LICENSE)
