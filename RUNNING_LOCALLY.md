# Running The Power House locally

This is a Vite + React + TypeScript app. To see your changes live (hot reload),
run it **on your own machine** — open `http://localhost:8081` and edit any file
under `src/`.

> **Note on cloud / web sessions:** Claude Code on the web runs in a sandboxed
> cloud container with no port forwarding, so a dev server started there is not
> reachable from your browser. To *view* the app you must run it locally, as
> described below. (You can still edit, build, and verify code in a web session.)

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- npm (ships with Node)

## Setup

```bash
git clone https://github.com/DejiA123/thepowerhouse.git
cd thepowerhouse
npm install
npm run dev
```

Then open **http://localhost:8081**.

### Use npm, not bun

The committed `bun.lockb` pins most packages to a private Lovable registry
(`europe-west4-npm.pkg.dev`) that is not reachable outside the Lovable build
environment. Installing with `npm` uses `package-lock.json`, which resolves
everything from the public npm registry (`registry.npmjs.org`).

## Environment variables

None are required to start the app — the Supabase URL and anon key are
hard-coded in `src/integrations/supabase/client.ts`, so the backend works out
of the box.

The only optional variable is the ElevenLabs API key, used for the text-to-speech
(audio Bible) feature. To enable it, copy `.env.example` to `.env` and set:

```bash
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## Useful scripts

| Command            | What it does                              |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Start the Vite dev server on port 8081    |
| `npm run build`    | Production build to `dist/`               |
| `npm run preview`  | Serve the production build locally        |
| `npm run lint`     | Run ESLint                                |
