---
name: run-app
description: Start this app's Vite dev server in a Linux cloud container and open it in headless Chromium at iPhone size, on The Power House address and the Church Space address (space.localhost), with screenshots. Use when asked to run, start, preview or screenshot the app, or to check a change in the real app.
---

# Run the app

Tested in a Claude Code cloud container (Linux, Node 22, Playwright's Chromium already installed).

## 1. Install

```bash
npm ci --no-audit --no-fund
```

No `.env` is needed: the Supabase address and public key are written into
`src/integrations/supabase/client.ts`.

## 2. Start the dev server

```bash
nohup npx vite --host 127.0.0.1 > "$SCRATCH/dev.log" 2>&1 &
timeout 60 bash -c 'until curl -sf http://127.0.0.1:8081 >/dev/null; do sleep 1; done'
```

(`$SCRATCH` = your scratchpad directory.) Port is 8081 (from `vite.config.ts`).

- **Don't use plain `npm run dev` here.** `vite.config.ts` has `host: "::"`, and the
  container has no IPv6, so it dies with `listen EAFNOSUPPORT :::8081`. `--host 127.0.0.1`
  overrides it without touching the config. (On a normal computer `npm run dev` is fine.)
- Editing `src/config/church.ts` restarts the server (it feeds index.html and the manifest).
- Stop it: `lsof -ti:8081 -sTCP:LISTEN | xargs -r kill`

## 3. Open it

```bash
node .claude/skills/run-app/drive.cjs "$SCRATCH" http://localhost:8081/ "Welcome"
node .claude/skills/run-app/drive.cjs "$SCRATCH" http://space.localhost:8081/ "Join your church"
```

Each run saves a screenshot in `$SCRATCH` and prints the page text and any errors.
**Look at the screenshot**, as a blank page means the app didn't start.

- `http://localhost:8081/` is **The Power House** address: Home with the tile grid. A new
  visitor also gets the "Welcome to The Power House" tour on top of it.
- `http://space.localhost:8081/` is the **Church Space** address (`PLATFORM.hosts` in
  `src/config/church.ts`). With no church chosen it shows "Join your church" (join code,
  QR scan, "Create your church space"). The driver points `space.localhost` at 127.0.0.1.
- Other pages: pass the path, e.g. `http://localhost:8081/bible`.

## Known gaps

- **Outside services are unreachable unless the environment allows them.** Hosts the
  network policy doesn't allow fail in the browser with `ERR_TUNNEL_CONNECTION_FAILED`.
  Pages still draw, but anything that needs that data doesn't work:
  - `swjzhzmhqyvwfwevijja.supabase.co`: database and server functions (sign-in,
    join-code lookup, live service check, YouTube videos)
  - `rest.api.bible`, `bible.helloao.org`: Bible text (`/bible` shows "Could not load
    chapter content")
  - `i.ytimg.com`: video thumbnails

  To check a host: `curl -sS -o /dev/null -w '%{http_code}\n' https://<host>/`
  (`CONNECT tunnel failed, response 403` means it's blocked). Only the user can change
  this, in the environment's Network access settings. Don't fake the data.
- `chromium-cli` isn't installed in the container, which is why `drive.cjs` exists.
