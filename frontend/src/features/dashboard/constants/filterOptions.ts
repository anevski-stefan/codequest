export const timeFrameOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'day', label: 'Last 24 Hours' },
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: 'year', label: 'Last Year' }
];

export const sortOptions = [
  { value: 'created', label: 'Newest First' },
  { value: 'created-asc', label: 'Oldest First' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'comments', label: 'Most Comments' }
];

export const commentRanges = [
  { value: '', label: 'Any Comments' },
  { value: '1-5', label: '1-5 Comments' },
  { value: '6-10', label: '6-10 Comments' },
  { value: '10+', label: '10+ Comments' }
];

export const languageOptions = [
  '',
  // Popular Web Languages
  'javascript',
  'typescript',
  'python',
  'java',
  'php',
  'ruby',
  'go',
  'rust',
  // Systems Programming
  'c',
  'cpp',
  'csharp',
  // Mobile Development
  'swift',
  'kotlin',
  'dart',
  // Other Popular Languages
  'scala',
  'r',
  // Functional Languages
  'elixir',
  'haskell',
  'clojure',
  'erlang',
  // Scientific Computing
  'julia',
  'matlab',
  // Shell Scripting
  'shell',
  'powershell',
  // Web Technologies
  'html',
  'css',
  // Web Frameworks
  'vue',
  'svelte',
  'angular',
  'react',
  // Additional Languages
  'elm',
  'ocaml',
  'fsharp',
  'fortran',
  'cobol',
  'pascal',
  'prolog',
  'scheme',
  'groovy',
  'objective-c',
  'verilog',
  'vhdl',
  'solidity',
  'crystal',
  'nim',
  'zig',
  'lua',
  'perl',
  'assembly'
] as const; 