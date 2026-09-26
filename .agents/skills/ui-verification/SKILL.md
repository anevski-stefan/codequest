---
name: ui-verification
description: How to prove a Code Quest UI change works before calling it done. Use after ANY frontend change, when asked to check, test, screenshot or verify a page, or when a feature "doesn't show up". Covers mock mode (VITE_USE_MOCK_DATA), running Vite, driving a browser, checking desktop and mobile widths, loading/empty/error states, console errors, and restoring the environment afterwards.
metadata:
  project: codequest
  version: "1.0"
---

# UI verification

Typechecking proves the code compiles, not that the feature works. A UI change is done
only when you have seen it render correctly in a browser — or you have told the owner
exactly what you could not check and how to check it.

## 1. Pick the data source

- **Mock mode (default for UI work):** set `VITE_USE_MOCK_DATA=true` in `frontend/.env`.
  No backend or GitHub needed, no rate limits, deterministic data, a "Mock data" badge in
  the header. Vite reloads on `.env` changes.
- **Real mode:** only when the change depends on real GitHub/Supabase behaviour. Needs the
  backend on :3000 and a logged-in session.
- If the endpoint you touched has no mock route, add one first (skill `mock-data`).

## 2. Run it

```bash
curl -s -o /dev/null -w "%{http_code}" localhost:5173   # is Vite already up?
cd frontend && npm run dev                               # only if not; note that YOU started it
```

Use whatever browser automation you have (Chrome DevTools MCP, Playwright, etc.). If none
is available, a headless Chrome with an isolated profile works:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --remote-debugging-port=9222 --user-data-dir=<scratch>/chrome-profile about:blank
```

Never reuse or close the owner's own browser session.

## 3. What to check

For every page or component you changed:

- [ ] **1440×900** and **390×844** — no horizontal overflow
      (`document.documentElement.scrollWidth <= clientWidth`)
- [ ] **Loading** state is a layout-shaped skeleton (throttle, or check on first load)
- [ ] **Empty** state explains why and offers an action
- [ ] **Error** state is visible with Retry (e.g. open a repo like `/explore/missing/x` in
      mock mode, or stop the backend in real mode)
- [ ] Interactions: click targets, keyboard (Tab, Enter, Esc), focus lands where expected
- [ ] Console has no errors or warnings from your change
- [ ] Nothing violet/purple, no emojis, copy is accurate

Prefer asserting with a small script (count elements, read text, check `activeElement`)
over eyeballing screenshots; take a screenshot for the visual pass.

## 4. Clean up (always)

- `VITE_USE_MOCK_DATA=false` in `frontend/.env`
- Stop dev servers, backends and browsers **you** started (check the process tree —
  `npm run dev` → nodemon → node can survive killing the parent)
- Run `npm run build` with mocks off and confirm fixtures are not in the bundle:
  `grep -l "Mock Developer" dist/assets/*.js` returns nothing

## 5. Report honestly

State what you checked (widths, states, flows) and what you didn't. If verification was
impossible (no browser, no credentials), say so and give the owner the exact steps.
