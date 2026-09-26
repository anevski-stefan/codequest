# Frontend rules

Applies to everything under `frontend/`. Activate `frontend-ui` and `ui-verification`
for any visual change.

## Where things live

| Need | Use |
|---|---|
| Page header (eyebrow, title, subtitle, actions) | `src/components/ui/PageHeader.tsx` |
| Issue in a list | `src/components/issues/IssueCard.tsx` (+ `ClaimBadge`) |
| Issue / PR detail | `IssueDetailsModal.tsx`, `PullRequestDetailsModal.tsx` (right slide-over) |
| Loading | `components/ui/Skeleton.tsx` (`skeleton` class), layout-shaped, no spinners for content |
| Empty / error | `components/ui/EmptyState.tsx`, `components/ui/ErrorDisplay.tsx` (with `onRetry`) |
| Filters | `components/ui/FilterChip.tsx`, `SegmentedControl.tsx` |
| Motion tokens | `src/lib/motion.ts`, `.reveal` + `--i` CSS cascade in `index.css` |
| API calls | `src/services/github.ts` only, via the shared `api` axios instance |
| Server state | TanStack Query; batch per-item lookups (see `hooks/useIssueClaims.ts`) |
| Mock fixtures | `src/mocks/` (see `mock-data` skill) |

## Rules

- Reuse the components above before writing new ones. Three near-identical cards is a bug.
- Every data view has loading, empty and error states. Errors offer Retry.
- Colours come from the design tokens (`bg-base`, `bg-surface`, `bg-sidebar`, blue accent).
  Never violet/purple/indigo. GitHub label colours go through `getLabelColors`.
- Icons: `lucide-react` only. No emojis in code, copy or alt text.
- Interactive elements are real buttons/links (or `role` + `tabIndex` + Enter/Space).
  Touch targets ≥ 36px (40px on mobile). Visible focus is global; don't remove it.
- Animate only `transform` and `opacity`; respect `prefers-reduced-motion` (global CSS does).
- Keep query/URL state in the URL when it's shareable (see `features/explore/Explore.tsx`).
- `localStorage` access goes in try/catch.
