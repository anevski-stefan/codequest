---
name: frontend-ui
description: Code Quest frontend design system and UI engineering rules. Use for ANY change to React components, pages, layout, styling, Tailwind classes, colours, typography, motion, icons, responsive behaviour, accessibility, or on-screen copy in frontend/. Covers the Dim/Slate palette, the single blue accent (no violet/purple), shared components (PageHeader, IssueCard, EmptyState, ErrorDisplay, Skeleton), loading/empty/error states and animation tokens.
metadata:
  project: codequest
  version: "1.0"
---

# Frontend UI

The UI should feel like a calm, professional developer tool (Linear/Vercel territory):
dense enough to be useful, quiet enough to read for hours. Consistency beats novelty.
Before building anything, look for an existing component that already does it.

## 1. Design system (fixed — do not reinvent)

Full tokens and class recipes: [references/design-system.md](references/design-system.md).

- Surfaces: sidebar `#1D2030` (`bg-sidebar`) → page `#252836` (`bg-base`) → cards
  `#2E3245` (`bg-surface`) → raised `#363B52` (`bg-elevated`).
- One accent: Tailwind `blue-*` (`#3B7BFF`). **Never violet, purple or indigo** — not for
  accents, badges, charts or statuses. Semantic colours only for meaning:
  green = good/free/open, amber = caution/soon, red = error/destructive.
- Borders are hairlines: `border-white/[0.06]`–`[0.09]`; hover `border-white/[0.14]`.
- Type: Plus Jakarta Sans; JetBrains Mono for code, numbers in tables (`tabular` class).
  Page title `text-xl font-bold tracking-tight text-white`; section label
  `text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500`.
- Icons: `lucide-react`, 14–16px in dense UI. No emojis anywhere.

## 2. Reuse these components

Catalogue with props and when to use each: [references/components.md](references/components.md).

`PageHeader`, `IssueCard`, `ClaimBadge`, `EmptyState` (icon, title, subtitle, action),
`ErrorDisplay` (with `onRetry`), `Skeleton` / `CardSkeletonList`, `FilterChip`,
`SegmentedControl`, `LoadMoreButton`, `IssueDetailsModal` (slide-over).
If you are about to write a third copy of something, extract it instead.

## 3. Every data view has four states

1. **Loading** — skeletons shaped like the final content (same grid, same heights).
   Never a centred spinner for page content.
2. **Empty** — `EmptyState` that says *why* it's empty and offers the next action
   ("Pick something from For You…"), never just "No data".
3. **Error** — `ErrorDisplay` with a human title, the cause if known (rate limit, not
   found), and `onRetry`. A failed secondary check shows a small inline notice, not nothing.
4. **Success** — the content, with a staggered `.reveal` entrance.

Hiding an element when its request fails is a bug: the user can't tell a feature exists.

## 4. Layout

- Page structure: header block `px-6 lg:px-8 pt-7` with `PageHeader`, a hairline, then a
  scrolling body. Lists use `grid grid-cols-1 lg:grid-cols-2 gap-2.5`.
- Detail views open as a right-hand slide-over (keeps the list in place), full screen on phones.
- Mobile first: check 390px. No horizontal scroll. Filters collapse into a bottom sheet.
- Asymmetric grids for dashboards (`lg:grid-cols-[minmax(0,1fr)_340px]`), not three equal cards.
- Shareable state (search query, tab, sort) belongs in the URL.

## 5. Motion

- Tokens in `src/lib/motion.ts` (`easeOut`, `spring`, `fadeUp`, `stagger`).
- List entrance: add `reveal` class and `style={{ '--i': index }}`; cap at ~24 items.
- Shared-element indicators (active nav, tabs, segmented controls) use Framer
  `layoutId` with a spring.
- Animate `transform`/`opacity` only. 150–300ms for UI, ≤500ms for entrances.
- Reduced motion is handled globally in `index.css`; don't add infinite animations to
  content (decorative loops belong on the landing page only).

## 6. Accessibility (non-negotiable)

- Clickable things are `<button>`/`<a>`, or `role="button"|"link"` + `tabIndex={0}` +
  Enter/Space handlers. Icon-only buttons get `aria-label`.
- Never convey meaning by colour alone: badges have icon + label (see `ClaimBadge`).
- Inputs have visible labels (or `aria-label` for search fields); errors use `role="alert"`.
- Focus rings are global (`:focus-visible`); don't remove outlines without a replacement.
- Contrast: body text `text-gray-300`+ on surfaces; `text-gray-500` only for meta text.

## 7. Copy on screen

- Short, specific, sentence case. Say what happens and what to do next.
- No filler ("seamless", "elevate", "unleash"), no exclamation marks, no emojis.
- Never state numbers or claims the data doesn't support (see `product-and-copy`).

## 8. Before you say it's done

Activate `ui-verification` and check the change in a browser at 1440px and 390px, in
mock mode, including loading, empty and error states. Run `npx tsc --noEmit -p .`,
`npx eslint src`, `npm run build`.
