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

Chrome DevTools MCP runs with `--autoConnect` and attaches to the owner's own Chrome.
Work only in tabs you open (`new_page`): never navigate, emulate, resize or close the
owner's tabs. Set widths with `emulate` viewports, which apply to your tab only. When
done, close only the tabs you opened; their emulation goes with them.

## 3. What to check

For every page or component you changed:

- [ ] **Layout at four widths: 390×844, 768×1024, 1024×768, 1440×900.** Layouts break
      most often between the two ends: `sm:` 640 sits between 390 and 768, `md:` at 768,
      and at 1024 the fixed 240px sidebar leaves ~784px for content. Below 1024 the
      mobile header, drawer and filter bottom sheet replace the desktop versions. At each
      width: no horizontal overflow (`document.documentElement.scrollWidth <= clientWidth`),
      nothing overlapping, clipped or squeezed, grids and filters reflow as intended
- [ ] **390 is a real phone emulation**, not just a narrow window: DevTools MCP `emulate`
      with `viewport: '390x844x3,mobile,touch'` plus a mobile `userAgent` (or Device
      Mode). Check that nothing depends on hover and touch targets are usable
- [ ] **Resize across 1024 without reloading** (`emulate` with a plain viewport such as
      `'1100x800x1'` then `'900x800x1'`, no `mobile`/`touch`; not `resize_page`, which
      resizes the owner's window): open the mobile drawer, a slide-over or the
      filter sheet, then cross the breakpoint; it closes or becomes the desktop version
- [ ] States, at 390 and 1440: **loading** is a layout-shaped skeleton (throttle, or
      check on first load); **empty** explains why and offers an action; **error** is
      visible with Retry (e.g. `/explore/missing/x` in mock mode, or stop the backend in
      real mode)
- [ ] Interactions: click targets, keyboard (Tab, Enter, Esc), focus lands where expected
- [ ] Console has no errors or warnings from your change
- [ ] Nothing violet/purple, no emojis, copy is accurate
- [ ] **Before/after:** screenshot the component before you change it and after, at the
      widths where the change is visible. The fix is done only if nothing in the after
      shot is worse: no control smaller, no text clipped, cramped or unreadable, no
      misalignment, no element gone
- [ ] Worst-case content: longest realistic strings, many items, zero items
- [ ] Shared component changed → every page that uses it checked

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
