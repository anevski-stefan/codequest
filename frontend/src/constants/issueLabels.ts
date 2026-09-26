// Labels that mark an issue as suitable for newcomers. Keep in sync with LABEL_OR in
// backend/src/controllers/suggestedIssuesController.js, which drives "For You".
export const BEGINNER_LABELS = [
  'good first issue',
  'good-first-issue',
  'help wanted',
  'help-wanted',
  'beginner',
  'first-timers-only',
  'easy',
  'up-for-grabs',
] as const;
