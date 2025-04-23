export const timeFrameOptions = [{
  value: 'all',
  label: 'All Time'
}, {
  value: 'day',
  label: 'Last 24 Hours'
}, {
  value: 'week',
  label: 'Last Week'
}, {
  value: 'month',
  label: 'Last Month'
}, {
  value: 'year',
  label: 'Last Year'
}];
export const sortOptions = [{
  value: 'created',
  label: 'Newest First'
}, {
  value: 'created-asc',
  label: 'Oldest First'
}, {
  value: 'updated',
  label: 'Recently Updated'
}, {
  value: 'comments',
  label: 'Most Comments'
}];
export const commentRanges = [{
  value: '',
  label: 'Any Comments'
}, {
  value: '1-5',
  label: '1-5 Comments'
}, {
  value: '6-10',
  label: '6-10 Comments'
}, {
  value: '10+',
  label: '10+ Comments'
}];
export const languageOptions = ['', 'javascript', 'typescript', 'python', 'java', 'php', 'ruby', 'go', 'rust', 'c', 'cpp', 'csharp', 'swift', 'kotlin', 'dart', 'scala', 'r', 'elixir', 'haskell', 'clojure', 'erlang', 'julia', 'matlab', 'shell', 'powershell', 'html', 'css', 'vue', 'svelte', 'angular', 'react', 'elm', 'ocaml', 'fsharp', 'fortran', 'cobol', 'pascal', 'prolog', 'scheme', 'groovy', 'objective-c', 'verilog', 'vhdl', 'solidity', 'crystal', 'nim', 'zig', 'lua', 'perl', 'assembly'] as const;