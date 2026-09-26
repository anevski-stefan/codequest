# Design system reference

## Colour tokens (tailwind.config.js)

| Token | Hex | Use |
|---|---|---|
| `bg-app` | `#171923` | rare: deepest background |
| `bg-sidebar` | `#1D2030` | sidebar, mobile top bar, footers |
| `bg-base` | `#252836` | page background |
| `bg-surface` | `#2E3245` | cards, panels, dropdowns |
| `bg-elevated` | `#363B52` | chips, inputs on surfaces, popover rows |
| slide-over panel | `#2A2E40` | issue/PR panels |

Accent: `blue-400` (text/icons), `blue-500` (solid buttons), `blue-500/[0.08]` fills,
`blue-500/25–45` borders.

Semantic:

| Meaning | Classes |
|---|---|
| Good / free / open / merged-positive | `text-green-300 bg-green-500/[0.08] border-green-500/25` |
| Caution / soon / requested | `text-amber-300 bg-amber-400/[0.08] border-amber-400/25` |
| Error / destructive / low | `text-red-300 bg-red-500/[0.06] border-red-500/20` |
| Neutral / stale / closed | `text-gray-300 bg-white/[0.05] border-white/[0.1]` |

Banned: every `violet-*`, `purple-*`, `indigo-*`, `fuchsia-*`. GitHub label colours in the
240–320° hue band are rotated to blue by `getLabelColors` — always render labels through it.

## Class recipes

Card (clickable):
```
rounded-xl border border-white/[0.07] bg-[#2E3245] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
hover:border-white/[0.14] hover:bg-[#31364C] hover:-translate-y-px
active:translate-y-0 transition-[background-color,border-color,box-shadow,transform] duration-200
```

Primary button:
```
h-9 px-3.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-[13px] font-semibold text-white
shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-all
```

Secondary button:
```
h-9 px-3.5 rounded-lg border border-white/[0.09] bg-[#2E3245] text-[13px] font-semibold
text-gray-300 hover:text-white hover:border-white/[0.18]
```

Filter chip / toggle (inactive → active):
```
h-8 px-3 rounded-lg border text-[11px] font-semibold
border-white/[0.09] bg-[#363B52] text-gray-400
→ border-blue-500/40 bg-blue-500/[0.08] text-blue-300
```

Input:
```
h-10 px-3.5 rounded-xl bg-[#252836] border border-white/[0.09] text-gray-100 placeholder-gray-500
focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,123,255,0.12)]
```

Modal / popover surface:
```
rounded-2xl bg-[#2E3245] border border-white/[0.09]
shadow-[0_32px_64px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]
```
Backdrop: `bg-[#0f111a]/60–70 backdrop-blur-[2px]`.

Section label: `text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500`.
Eyebrow above page title: same but `text-blue-400/80` and `mb-1.5`.

## Spacing and sizing

- Page gutters `px-6 lg:px-8`; section gap `space-y-8`; card grid gap `gap-2.5`.
- Button/input heights: 32px (chips), 36px (buttons), 40px (inputs, mobile targets).
- Radius: `rounded-lg` controls, `rounded-xl` cards, `rounded-2xl` panels/modals.
