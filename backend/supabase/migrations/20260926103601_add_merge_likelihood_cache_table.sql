-- Per-repository Merge Likelihood cache (24h). Keys are lowercased.
-- Only public repositories are cached; see mergeLikelihoodService.
-- Dropped first because an earlier draft of this table (different columns)
-- may exist; it only holds recomputable cache rows.
DROP TABLE IF EXISTS merge_likelihood_cache;

CREATE TABLE merge_likelihood_cache (
  owner text NOT NULL,
  repo text NOT NULL,
  likelihood text NOT NULL,
  stats jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner, repo)
);

ALTER TABLE merge_likelihood_cache ENABLE ROW LEVEL SECURITY;
