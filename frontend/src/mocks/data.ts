/**
 * Deterministic fixture data for mock mode (VITE_USE_MOCK_DATA=true).
 * Shapes mirror what the backend returns so the UI runs unchanged.
 */

// Seeded PRNG so every reload renders the same data.
let seed = 20260925;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const NOW = Date.now();
const DAY = 86400000;
export const daysAgo = (d: number, h = 0) => new Date(NOW - d * DAY - h * 3600000).toISOString();
const daysAhead = (d: number) => new Date(NOW + d * DAY);

// Initials avatar as a data URI — works offline and never points at a real person.
const AVATAR_TONES = ['#3B7BFF', '#0EA5A4', '#F59E0B', '#EF6F6C', '#22C55E', '#64748B', '#EC8F3C'];
export const avatar = (name: string) => {
  const initials = name.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bg = AVATAR_TONES[h % AVATAR_TONES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="32" font-weight="700" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/* ── People ─────────────────────────────────────────────────────── */

export const ME = {
  login: 'mock-dev',
  id: 900001,
  avatar_url: avatar('Mock Developer'),
  name: 'Mock Developer',
  email: 'mock@codequest.local',
  bio: 'Frontend developer learning open source one pull request at a time.',
  public_repos: 14,
  public_gists: 3,
  followers: 38,
  following: 51,
  company: 'Independent',
  location: 'Skopje, North Macedonia',
  blog: 'https://example.dev',
  twitter_username: null,
  created_at: '2021-03-14T10:00:00Z',
  hireable: true,
};

const PEOPLE = [
  'lina-okafor', 'tomasz-wrobel', 'priya-raman', 'mateo-silva', 'hana-kobayashi', 'jonas-berg',
  'amara-diallo', 'felix-brandt', 'sofia-marchetti', 'dmitri-volkov', 'aisha-karim', 'leo-nakamura',
  'noor-haddad', 'oskar-lindqvist', 'ines-carvalho', 'kwame-mensah', 'yara-costa', 'bram-dekker',
];
export const person = (login: string) => ({ login, avatar_url: avatar(login), id: Math.abs([...login].reduce((a, c) => a * 33 + c.charCodeAt(0), 7)) % 1e7 });

/* ── Repositories ───────────────────────────────────────────────── */

interface RepoSeed {
  full_name: string; description: string; language: string; stars: number; forks: number; topics: string[]; license: string;
}

const REPO_SEEDS: RepoSeed[] = [
  { full_name: 'vercel/next.js', description: 'The React Framework', language: 'TypeScript', stars: 131200, forks: 28100, topics: ['react', 'nextjs', 'ssr', 'framework'], license: 'MIT License' },
  { full_name: 'microsoft/vscode', description: 'Visual Studio Code', language: 'TypeScript', stars: 172400, forks: 30500, topics: ['editor', 'electron', 'typescript'], license: 'MIT License' },
  { full_name: 'rust-lang/rustlings', description: 'Small exercises to get you used to reading and writing Rust code', language: 'Rust', stars: 56300, forks: 10300, topics: ['rust', 'exercises', 'beginner'], license: 'MIT License' },
  { full_name: 'supabase/supabase', description: 'The Postgres development platform', language: 'TypeScript', stars: 81700, forks: 8200, topics: ['postgres', 'database', 'realtime'], license: 'Apache License 2.0' },
  { full_name: 'grafana/grafana', description: 'The open and composable observability and data visualization platform', language: 'TypeScript', stars: 67900, forks: 12600, topics: ['monitoring', 'dashboards', 'observability'], license: 'AGPL-3.0' },
  { full_name: 'sveltejs/svelte', description: 'Web development for the rest of us', language: 'JavaScript', stars: 83100, forks: 4400, topics: ['svelte', 'compiler', 'ui'], license: 'MIT License' },
  { full_name: 'tailwindlabs/tailwindcss', description: 'A utility-first CSS framework for rapid UI development', language: 'TypeScript', stars: 86400, forks: 4400, topics: ['css', 'tailwind', 'design-system'], license: 'MIT License' },
  { full_name: 'django/django', description: 'The Web framework for perfectionists with deadlines', language: 'Python', stars: 83200, forks: 32400, topics: ['python', 'web', 'orm'], license: 'BSD 3-Clause' },
  { full_name: 'huggingface/transformers', description: 'State-of-the-art machine learning for PyTorch, TensorFlow and JAX', language: 'Python', stars: 139800, forks: 27900, topics: ['nlp', 'machine-learning', 'pytorch'], license: 'Apache License 2.0' },
  { full_name: 'denoland/deno', description: 'A modern runtime for JavaScript and TypeScript', language: 'Rust', stars: 99400, forks: 5400, topics: ['runtime', 'typescript', 'rust'], license: 'MIT License' },
  { full_name: 'prisma/prisma', description: 'Next-generation ORM for Node.js and TypeScript', language: 'TypeScript', stars: 41200, forks: 1600, topics: ['orm', 'database', 'typescript'], license: 'Apache License 2.0' },
  { full_name: 'golang/go', description: 'The Go programming language', language: 'Go', stars: 126300, forks: 17800, topics: ['go', 'language', 'compiler'], license: 'BSD 3-Clause' },
  { full_name: 'kestrel-io/queue', description: 'Durable background jobs for Go services', language: 'Go', stars: 2140, forks: 187, topics: ['go', 'jobs', 'queue'], license: 'MIT License' },
  { full_name: 'lumen-ui/lumen', description: 'Accessible React primitives with zero runtime styles', language: 'TypeScript', stars: 4870, forks: 312, topics: ['react', 'a11y', 'components'], license: 'MIT License' },
  { full_name: 'tidewater/ledger-cli', description: 'Plain-text accounting in your terminal', language: 'Python', stars: 912, forks: 64, topics: ['cli', 'finance', 'python'], license: 'GPL-3.0' },
];

export const REPOS = REPO_SEEDS.map((r, i) => {
  const [owner] = r.full_name.split('/');
  return {
    id: 5000 + i,
    name: r.full_name.split('/')[1],
    full_name: r.full_name,
    description: r.description,
    stargazers_count: r.stars,
    forks_count: r.forks,
    watchers_count: Math.round(r.stars * 0.02),
    open_issues_count: int(40, 2400),
    language: r.language,
    html_url: `https://github.com/${r.full_name}`,
    default_branch: 'main',
    topics: r.topics,
    updated_at: daysAgo(int(0, 3), int(0, 20)),
    license: { name: r.license },
    owner: { login: owner, avatar_url: `https://github.com/${owner}.png?size=80` },
  };
});
export type MockRepo = (typeof REPOS)[number];
export const findRepo = (fullName: string) => REPOS.find(r => r.full_name.toLowerCase() === fullName.toLowerCase());

/* ── Labels & issues ───────────────────────────────────────────── */

const LABELS = {
  gfi: { name: 'good first issue', color: '7057ff' },
  help: { name: 'help wanted', color: '008672' },
  bug: { name: 'bug', color: 'd73a4a' },
  docs: { name: 'documentation', color: '0075ca' },
  enh: { name: 'enhancement', color: 'a2eeef' },
  a11y: { name: 'accessibility', color: 'fbca04' },
  test: { name: 'tests', color: 'bfd4f2' },
  perf: { name: 'performance', color: 'f9d0c4' },
  dx: { name: 'dx', color: 'c5def5' },
};

const TITLES: [string, (keyof typeof LABELS)[]][] = [
  ['Add keyboard shortcut hint to the command menu', ['gfi', 'enh']],
  ['Typo in CONTRIBUTING.md install steps', ['gfi', 'docs']],
  ['Dark mode toggle state is lost after reload', ['bug', 'gfi']],
  ['Flaky test in retry backoff under slow CI runners', ['test', 'help']],
  ['Document the environment variables for local setup', ['docs', 'help']],
  ['Focus ring missing on icon-only buttons', ['a11y', 'gfi']],
  ['CSV export ignores currency for the first 50 rows', ['bug', 'gfi']],
  ['Support `--json` output flag in the list command', ['enh', 'help']],
  ['Improve error message when config file is missing', ['dx', 'gfi']],
  ['Replace deprecated `substr` calls with `slice`', ['gfi']],
  ['Add alt text to images in the getting started guide', ['a11y', 'docs']],
  ['Memoize expensive selector in the sidebar tree', ['perf', 'help']],
  ['Examples folder uses an outdated import path', ['docs', 'gfi']],
  ['Date picker announces wrong month to screen readers', ['a11y', 'bug']],
  ['Add unit tests for the slugify helper', ['test', 'gfi']],
  ['Pagination skips the last page when total is a multiple of 20', ['bug', 'help']],
  ['Respect prefers-reduced-motion in the onboarding carousel', ['a11y', 'enh']],
  ['Lazy-load the syntax highlighter on docs pages', ['perf', 'enh']],
  ['Clarify licence section in README', ['docs']],
  ['Warn when two plugins register the same hook name', ['dx', 'enh']],
  ['Empty state shows raw `undefined` when list is empty', ['bug', 'gfi']],
  ['Add Macedonian translation for the settings page', ['help', 'gfi']],
  ['Migrate snapshot tests to inline snapshots', ['test']],
  ['Link to the discussion forum from the issue template', ['docs', 'gfi']],
];

const BODY = (title: string, repo: string) => `## What happens

${title}. This shows up on the latest \`main\` and was reported by a few people in discussions.

## Steps to reproduce

1. Clone \`${repo}\` and run the dev server
2. Open the affected page
3. Observe the behaviour described above

## Expected

The behaviour should match the documentation.

## Notes for contributors

This is a good place to start if you're new to the codebase. The relevant code is small and there are existing tests you can copy from. Comment below if you want to take it and a maintainer will assign you.`;

let issueId = 880000;
export const makeIssue = (repo: MockRepo, number: number, titleIdx: number, opts: { state?: 'open' | 'closed'; age?: number; comments?: number; assignee?: boolean } = {}) => {
  const [title, labelKeys] = TITLES[titleIdx % TITLES.length];
  const author = pick(PEOPLE);
  const age = opts.age ?? int(0, 45);
  return {
    id: issueId++,
    number,
    title,
    body: BODY(title, repo.full_name),
    state: opts.state ?? 'open',
    created_at: daysAgo(age, int(0, 23)),
    updated_at: daysAgo(Math.max(0, age - int(0, 3)), int(0, 23)),
    comments: opts.comments ?? (rand() < 0.35 ? 0 : int(1, 11)),
    labels: labelKeys.map(k => LABELS[k]),
    repository_url: `https://api.github.com/repos/${repo.full_name}`,
    html_url: `${repo.html_url}/issues/${number}`,
    user: { login: author, avatar_url: avatar(author) },
    repoStars: repo.stargazers_count,
    assignee: opts.assignee ? ME.login : null,
  };
};
export type MockIssue = ReturnType<typeof makeIssue>;

export const ISSUES: MockIssue[] = Array.from({ length: 160 }, (_, i) => {
  const repo = REPOS[i % REPOS.length];
  return makeIssue(repo, int(120, 9800), int(0, TITLES.length - 1));
}).sort((a, b) => b.created_at.localeCompare(a.created_at));

export const ASSIGNED_OPEN: MockIssue[] = [
  makeIssue(findRepo('lumen-ui/lumen')!, 482, 5, { age: 6, comments: 4, assignee: true }),
  makeIssue(findRepo('tidewater/ledger-cli')!, 412, 6, { age: 3, comments: 2, assignee: true }),
  makeIssue(findRepo('rust-lang/rustlings')!, 2031, 14, { age: 11, comments: 6, assignee: true }),
];
export const ASSIGNED_CLOSED: MockIssue[] = [
  makeIssue(findRepo('supabase/supabase')!, 30117, 1, { state: 'closed', age: 40, comments: 3, assignee: true }),
  makeIssue(findRepo('kestrel-io/queue')!, 88, 8, { state: 'closed', age: 58, comments: 5, assignee: true }),
];

/* ── Comments ──────────────────────────────────────────────────── */

const COMMENT_POOL = [
  'I can reproduce this on the latest release. Happy to take a look if nobody else is on it.',
  'Thanks for the report! The fix probably belongs in the helper rather than the component.',
  'Could I work on this? I have a rough idea of the fix.',
  'Assigned to you. Ping us here if you get stuck, and please add a test case.',
  'Opened a draft PR. Still need to update the docs but the behaviour is fixed.',
  'Left a couple of small review comments, otherwise this looks good to me.',
  'Is this still relevant after the refactor last month?',
  'Yes, it still happens. Here is a minimal reproduction repository.',
];
export const commentsFor = (issueNumber: number, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const who = PEOPLE[(issueNumber + i * 7) % PEOPLE.length];
    return {
      id: issueNumber * 100 + i,
      body: COMMENT_POOL[(issueNumber + i) % COMMENT_POOL.length],
      user: { login: who, avatar_url: avatar(who) },
      createdAt: daysAgo(count - i, 3),
      updatedAt: daysAgo(count - i, 3),
    };
  });

/* ── Repo insights ─────────────────────────────────────────────── */

// Stable per repository: rotate the people list by a hash of the name.
const rotateFor = (key: string, n: number) => {
  const h = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
  return Array.from({ length: n }, (_, i) => PEOPLE[(h + i * 5) % PEOPLE.length]);
};

export const topContributorsFor = (fullName: string) => {
  const people = rotateFor(fullName, 5);
  const weights = [34, 22, 17, 14, 13];
  const base = fullName.length * 97;
  return people.map((login, i) => ({ login, avatar_url: avatar(login), contributions: Math.round(base * weights[i] / 10), percentage: weights[i] }));
};
export const lotteryFor = (fullName: string) => {
  const people = rotateFor(`${fullName}:prs`, 4);
  const pct = [31, 24, 18, 9];
  return people.map((login, i) => ({ login, avatar_url: avatar(login), pull_requests: pct[i] * 3, percentage: pct[i] }));
};
export const confidenceFor = (fullName: string) => {
  const p = 48 + (fullName.length * 7) % 44;
  return {
    percentage: p,
    message: p >= 75 ? 'Strong and active contributor community with consistent engagement.'
      : p >= 50 ? 'Moderate contributor activity with room for growth.'
      : 'Few stargazers and forkers come back later on to a meaningful contribution.',
  };
};

const PR_TITLES = [
  'fix: handle empty config gracefully', 'docs: clarify install steps on Windows', 'feat: add --json output flag',
  'test: cover retry backoff edge cases', 'refactor: extract date helpers', 'fix(a11y): add focus ring to icon buttons',
  'chore: bump dev dependencies', 'perf: memoize sidebar selector', 'feat: Macedonian translation for settings',
  'fix: pagination off-by-one on last page', 'docs: add architecture overview', 'fix: respect reduced motion in carousel',
];
export const pullsFor = (repo: MockRepo, state: 'open' | 'closed') =>
  PR_TITLES.map((title, i) => {
    const who = PEOPLE[(i * 5 + repo.id) % PEOPLE.length];
    const merged = state === 'closed' && i % 4 !== 3;
    return {
      id: repo.id * 1000 + i + (state === 'closed' ? 500 : 0),
      number: 900 + i * 3 + (state === 'closed' ? 1 : 0),
      title,
      state,
      created_at: daysAgo(i * 2 + 1),
      updated_at: daysAgo(i),
      closed_at: state === 'closed' ? daysAgo(i) : null,
      merged_at: merged ? daysAgo(i) : null,
      draft: state === 'open' && i % 5 === 4,
      user: { login: who, avatar_url: avatar(who) },
      labels: i % 3 === 0 ? [LABELS.gfi] : i % 3 === 1 ? [LABELS.docs] : [],
      requested_reviewers: state === 'open' ? [person(PEOPLE[(i + 3) % PEOPLE.length])] : [],
      head: { ref: title.split(':')[0].replace(/\W+/g, '-') + `-${i}`, sha: `a1b2c3${i}` },
      base: { ref: 'main' },
      commits: int(1, 7),
      additions: int(4, 240),
      deletions: int(0, 90),
      changed_files: int(1, 9),
      comments: int(0, 6),
      review_comments: int(0, 8),
    };
  });

export const pullDetails = (repo: MockRepo, number: number) => {
  const pr = [...pullsFor(repo, 'open'), ...pullsFor(repo, 'closed')].find(p => p.number === number) ?? pullsFor(repo, 'open')[0];
  const files = [
    { filename: 'src/commands/export.ts', status: 'modified', additions: 18, deletions: 6, changes: 24 },
    { filename: 'src/format/currency.ts', status: 'modified', additions: 7, deletions: 2, changes: 9 },
    { filename: 'test/export.spec.ts', status: 'added', additions: 42, deletions: 0, changes: 42 },
  ];
  return {
    ...pr,
    files,
    commits_data: [
      { sha: 'f3a9c21', commit: { message: pr.title, author: { name: pr.user.login, email: `${pr.user.login}@users.noreply.github.com`, date: pr.created_at } }, author: pr.user, files: files.map(f => f.filename) },
      { sha: '9be0d14', commit: { message: 'test: add regression case', author: { name: pr.user.login, email: `${pr.user.login}@users.noreply.github.com`, date: pr.updated_at } }, author: pr.user, files: ['test/export.spec.ts'] },
    ],
  };
};

/* ── Users, activity, starred ─────────────────────────────────── */

export const STARRED = REPOS.filter((_, i) => i % 3 !== 2).slice(0, 9);

export const USER_REPOS = [
  { name: 'dotfiles', description: 'Shell, editor and terminal config', language: 'Shell', stars: 12, forks: 1 },
  { name: 'budget-tui', description: 'Terminal UI for tracking monthly spending', language: 'Rust', stars: 34, forks: 4 },
  { name: 'portfolio', description: 'Personal site built with Astro', language: 'TypeScript', stars: 3, forks: 0 },
  { name: 'leetcode-notes', description: null, language: 'Python', stars: 7, forks: 2 },
  { name: 'react-hooks-lab', description: 'Small experiments with custom React hooks', language: 'TypeScript', stars: 19, forks: 3 },
  { name: 'weather-cli', description: 'Forecast in your terminal using open data', language: 'Go', stars: 11, forks: 1 },
  { name: 'css-art', description: 'Pure CSS illustrations', language: 'CSS', stars: 2, forks: 0 },
  { name: 'markdown-slides', description: 'Turn markdown into keyboard-driven slides', language: 'JavaScript', stars: 26, forks: 5 },
].map((r, i) => ({
  id: 7000 + i,
  name: r.name,
  full_name: `${ME.login}/${r.name}`,
  html_url: `https://github.com/${ME.login}/${r.name}`,
  description: r.description,
  language: r.language,
  stargazers_count: r.stars,
  forks_count: r.forks,
  updated_at: daysAgo(i * 4),
  owner: { login: ME.login, avatar_url: ME.avatar_url },
}));

export const activityFor = (login: string) => {
  const types: [string, Record<string, unknown>][] = [
    ['PushEvent', { size: 3, commits: [] }],
    ['PullRequestEvent', { action: 'opened' }],
    ['IssueCommentEvent', { action: 'created' }],
    ['WatchEvent', { action: 'started' }],
    ['CreateEvent', { ref_type: 'branch', ref: 'fix/focus-ring' }],
    ['PullRequestEvent', { action: 'closed' }],
    ['ForkEvent', {}],
    ['IssuesEvent', { action: 'opened' }],
  ];
  return Array.from({ length: 14 }, (_, i) => {
    const [type, payload] = types[i % types.length];
    const repo = i % 4 === 0 ? `${login}/${USER_REPOS[i % USER_REPOS.length].name}` : REPOS[(i * 3) % REPOS.length].full_name;
    return {
      id: `evt-${login}-${i}`,
      type,
      actor: { login, avatar_url: login === ME.login ? ME.avatar_url : avatar(login) },
      repo: { name: repo },
      created_at: daysAgo(Math.floor(i / 2), i * 2),
      payload,
    };
  });
};

export const SEARCH_USERS = PEOPLE.map((login, i) => ({
  ...person(login),
  name: login.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' '),
  bio: pick(['Maintainer of small CLI tools.', 'Compilers and coffee.', 'Design systems at a fintech.', 'Open data and civic tech.', 'Rust in production.']),
  public_repos: 20 + i * 7,
  public_gists: i % 5,
  followers: 12000 - i * 540,
  following: 40 + i * 3,
  company: i % 3 === 0 ? 'Independent' : null,
  location: pick(['Lisbon', 'Berlin', 'Nairobi', 'Osaka', 'Toronto', 'Skopje', 'São Paulo']),
  blog: '',
  twitter_username: null,
  created_at: '2016-05-02T00:00:00Z',
  hireable: i % 4 === 0 ? true : null,
}));
export const userProfile = (login: string) => login === ME.login ? ME : SEARCH_USERS.find(u => u.login === login) ?? null;

/* ── Hackathons ───────────────────────────────────────────────── */

const HACKATHON_SEEDS = [
  ['Northwind Climate Jam', 'Online', 'devpost', '$12,000', ['climate', 'data']],
  ['Lisbon Chain Build Week', 'Lisbon', 'devfolio', '$25,000', ['web3', 'infra']],
  ['Open Data Sprint', 'Online', 'mlh', '$5,000', ['open-data', 'civic']],
  ['Rust Embedded Weekend', 'Berlin', 'devpost', '$8,000', ['rust', 'hardware']],
  ['Civic Tech Skopje', 'Skopje', 'devpost', '€4,000', ['civic', 'gov']],
  ['Accessible Web Challenge', 'Online', 'mlh', '$6,500', ['a11y', 'frontend']],
  ['AI for Farmers Hack', 'Nairobi', 'devfolio', '$10,000', ['ai', 'agritech']],
  ['Local-First Software Jam', 'Online', 'devpost', '$3,000', ['crdt', 'offline']],
  ['Student Game Jam Autumn', 'Online', 'mlh', 'Swag + mentorship', ['games', 'students']],
  ['Health Data Hack Toronto', 'Toronto', 'devpost', '$15,000', ['health', 'data']],
  ['Green Cloud Challenge', 'Online', 'devfolio', '$7,500', ['cloud', 'sustainability']],
  ['Maps & Mobility Hack', 'Osaka', 'devpost', '¥1,000,000', ['maps', 'transport']],
] as const;

const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const HACKATHONS = HACKATHON_SEEDS.map(([title, location, source, prize, tags], i) => {
  const start = i < 3 ? daysAhead(-(i + 2)) : daysAhead(i * 5 - 8);
  const end = new Date(start.getTime() + (3 + (i % 4) * 7) * DAY);
  return {
    url: `https://example.com/hackathons/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title,
    description: `A ${location === 'Online' ? 'remote' : 'hybrid'} event focused on ${tags.join(' and ')}. Beginners welcome; mentors on call throughout.`,
    startDate: fmt(start),
    endDate: fmt(end),
    source,
    location,
    prize,
    participantCount: 120 + i * 85,
    tags: [...tags],
  };
});

/* ── Notifications ────────────────────────────────────────────── */

export const NOTIFICATIONS = [
  { id: 'n1', user_id: 'me', type: 'assigned', title: 'You were assigned to lumen-ui/lumen#482', message: 'Focus ring missing on icon-only buttons. The maintainer asked for a test case with the fix.', link: '/explore/lumen-ui/lumen?issue=482', is_read: false, created_at: daysAgo(0, 2) },
  { id: 'n2', user_id: 'me', type: 'comment', title: 'New reply on tidewater/ledger-cli#412', message: 'lina-okafor: "Could I work on this? I have a rough idea of the fix."', link: '/explore/tidewater/ledger-cli?issue=412', is_read: false, created_at: daysAgo(0, 7) },
  { id: 'n3', user_id: 'me', type: 'merged', title: 'Your pull request was merged', message: 'supabase/supabase#30121 — docs: clarify install steps on Windows', link: null, is_read: true, created_at: daysAgo(3) },
  { id: 'n4', user_id: 'me', type: 'hackathon', title: 'Civic Tech Skopje opens registration', message: 'The event starts in two weeks. Teams of up to four.', link: '/hackathons', is_read: true, created_at: daysAgo(6) },
];

/* ── AI streams ───────────────────────────────────────────────── */

export const explainText = (title: string, repo: string) => `**In short:** ${title.replace(/\.$/, '')}. The behaviour comes from a single code path, so the fix should be small.

**Where to look**
- The component or command that owns this feature in \`${repo}\`
- Its helper module, where the value is computed before rendering
- The existing test file next to it; copy the closest case

**Suggested approach**
1. Reproduce it locally with the steps in the issue.
2. Write a failing test that captures the expected behaviour.
3. Make the smallest change that turns the test green.
4. Mention the issue number in your PR description.

**Difficulty:** Beginner · roughly 20–60 lines including the test.`;

export const onboardingText = (repo: string) => `## ${repo} in two minutes

**What it is:** ${findRepo(repo)?.description ?? 'An open source project'}.

### Layout
- \`src/\` — application code, split by feature
- \`test/\` — unit and integration tests, mirrors \`src/\`
- \`docs/\` — user-facing documentation
- \`scripts/\` — release and maintenance tooling

### Get it running
\`\`\`bash
git clone https://github.com/${repo}.git
cd ${repo.split('/')[1]}
npm install
npm run dev
\`\`\`

### Conventions
- Conventional commit messages (\`fix:\`, \`feat:\`, \`docs:\`)
- Every bug fix needs a regression test
- Small PRs get reviewed within a few days; link the issue you're fixing

### Good first steps
Look for issues labelled **good first issue** or **help wanted**, comment to claim one, then open a draft PR early so maintainers can guide you.`;
