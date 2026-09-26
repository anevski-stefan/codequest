# Component catalogue

Paths are relative to `frontend/src/`.

| Component | Path | Use for | Notes |
|---|---|---|---|
| `Layout` | `components/Layout.tsx` | App shell | Sidebar groups (Workspace / Discover), breadcrumb, ⌘K palette, mock badge. Add new pages to `WORKSPACE`/`DISCOVER` and `ROUTE_TITLES`. |
| `CommandPalette` | `components/CommandPalette.tsx` | Global navigation | Items come from `Layout`; add keywords for renamed pages. |
| `PageHeader` | `components/ui/PageHeader.tsx` | Top of every page | `eyebrow` (Workspace/Discover/Account), `title`, `subtitle`, `actions`. |
| `IssueCard` | `components/issues/IssueCard.tsx` | Any issue in a list | Pass `claim`/`claimLoading` from `useIssueClaims`; `dateField="updatedAt"` for the user's own work. |
| `ClaimBadge` | `components/issues/ClaimBadge.tsx` | Claim status | Icon + label; `describe={false}` when the reason is already visible. |
| `IssueDetailsModal` | `components/IssueDetailsModal.tsx` | Issue detail | Right slide-over; claim banner, AI breakdown, discussion, composer with drafts. |
| `PullRequestDetailsModal` | `components/PullRequestDetailsModal.tsx` | PR detail | Same slide-over pattern, wider. |
| `CommentForm` | `components/comments/CommentForm.tsx` | Composer | Growing textarea; Enter sends; `initialValue` + `key` to prefill drafts. |
| `EmptyState` | `components/ui/EmptyState.tsx` | Nothing to show | Always explain why and give an `action`. |
| `ErrorDisplay` | `components/ui/ErrorDisplay.tsx` | Failed request | Pass `onRetry`. Map 403/429 to "rate limit", 404 to "not found". |
| `Skeleton`, `CardSkeletonList` | `components/ui/Skeleton.tsx`, `components/skeletons/` | Loading | Match the real layout. |
| `FilterChip` | `components/ui/FilterChip.tsx` | Select-style filter | Native `<select>` overlay for accessibility. |
| `SegmentedControl` | `components/ui/SegmentedControl.tsx` | 2–4 exclusive options | Radiogroup semantics, animated thumb. |
| `LoadMoreButton` | `components/ui/LoadMoreButton.tsx` | Infinite lists | Pair with `useInfiniteQuery`. |
| `FeedbackModal` | `components/FeedbackModal.tsx` | Feedback | Shared by app and landing page. |

## Hooks and helpers

| Hook / helper | Path | Purpose |
|---|---|---|
| `useIssueComments` | `hooks/useIssueComments.ts` | Open an issue panel with comments, prefetch, add comment |
| `useIssueClaims`, `claimFor` | `hooks/useIssueClaims.ts` | Batched claim status (chunks of 25), `{ claims, loading, error, retry }` |
| `getLabelColors` | `features/dashboard/utils/filterUtils.ts` | GitHub label → dark-theme chip (rotates violet to blue) |
| `formatRelativeDate`, `formatCount` | `utils/` | "3 days ago", "12.4k" |
| `usePageTitle` | `hooks/usePageTitle.ts` | Document title per page |
| `trackOutcome` | `services/github.ts` | Fire-and-forget product events (whitelisted names only) |
