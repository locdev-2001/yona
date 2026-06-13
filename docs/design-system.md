# Chó Rách Management — Design System

> Single source of truth for visual design. Living doc. Cross-links: [`system-architecture`](./system-architecture.md) (§9b Frontend stack), [`crm-domain-definition`](./crm-domain-definition.md), [`crm-business-rules`](./crm-business-rules.md).
> Status: live · Updated: 2026-06-13

## 1. Direction

**Style:** Data-Dense Enterprise Dashboard. Priority = *maximum data visibility, scannable*, not marketing flash.

- KPI cards · data tables · kanban pipeline · sidebar nav · command palette · filter bars.
- **Avoid:** ornate/marketing aesthetics, heavy gradients, decorative shadows, wide landing-page padding, color used only for decoration.
- Every functional color carries meaning (status) + always paired with icon/text, never color-alone.

Stack (per [`system-architecture`](./system-architecture.md) §9b): **shadcn/ui (Radix + Tailwind v4)** · TanStack Table v8 · dnd-kit · lucide-react · sonner.

## 2. Color

### Primary — Blue 600

Neutral against status semantics (won-green / lost-red / pending-amber) → "disappears" so status colors do the signaling. Used by most CRM/SaaS for this reason.

| Scale | Hex | | Scale | Hex |
|---|---|---|---|---|
| 50  | `#EFF6FF` | | 500 | `#3B82F6` |
| 100 | `#DBEAFE` | | **600** ★ | **`#2563EB`** |
| 200 | `#BFDBFE` | | 700 | `#1D4ED8` |
| 300 | `#93C5FD` | | 800 | `#1E40AF` |
| 400 | `#60A5FA` | | 900 | `#1E3A8A` |

- **Primary** `#2563EB` · **Hover/active** `#1D4ED8` (700) · **Focus ring** `#2563EB` · **Subtle bg/accent** `#EFF6FF` (50).
- Dark mode: lift primary to `#3B82F6` (500) for contrast parity on dark surfaces.

### Status (fixed — never reassign)

| Role | Fg | Bg (subtle) |
|---|---|---|
| Won / Success | `#059669` emerald-600 | `#ECFDF5` |
| Pending / Warning | `#D97706` amber-600 | `#FFFBEB` |
| Lost / Danger | `#DC2626` red-600 | `#FEF2F2` |
| Info | `#0EA5E9` sky-500 | `#F0F9FF` |

### Neutrals — Slate

Background `#F8FAFC` · Text `#0F172A` · Muted text `#64748B` · Border `#E2E8F0` · Card `#FFFFFF`.

## 3. shadcn/ui tokens

```css
:root {
  --background:#F8FAFC;  --foreground:#0F172A;
  --card:#FFFFFF;        --card-foreground:#0F172A;
  --primary:#2563EB;     --primary-foreground:#FFFFFF;
  --secondary:#F1F5F9;   --secondary-foreground:#0F172A;
  --muted:#F1F5F9;       --muted-foreground:#64748B;
  --accent:#EFF6FF;      --accent-foreground:#1D4ED8;
  --destructive:#DC2626; --destructive-foreground:#FFFFFF;
  --border:#E2E8F0;      --input:#E2E8F0;  --ring:#2563EB;
  --radius:0.625rem;
}
.dark {
  --background:#0B1220;  --foreground:#E2E8F0;
  --card:#111A2E;        --card-foreground:#E2E8F0;
  --primary:#3B82F6;     --primary-foreground:#0B1220;
  --secondary:#16213A;   --secondary-foreground:#E2E8F0;
  --muted:#16213A;       --muted-foreground:#94A3B8;
  --accent:#1E293B;      --accent-foreground:#93C5FD;
  --destructive:#EF4444; --destructive-foreground:#0B1220;
  --border:#22304B;      --input:#22304B;  --ring:#3B82F6;
}
```

## 4. Typography

| Role | Font | Notes |
|---|---|---|
| Heading / Body | **Inter** | shadcn default; 16px base, line-height 1.5 |
| Numbers (tables, money, KPI) | Inter w/ **`tabular-nums`** | prevents column jitter — mandatory in data grids |
| Mono (IDs, code, logs) | **Geist Mono** / system mono | optional |

Type scale: `12 · 14 · 16 · 18 · 24 · 32`. Weight: body 400, labels 500, headings 600.

## 5. Shape & spacing

- **Radius:** 10px (`--radius`) for cards/inputs; buttons same scale. Pick one system, no mixing.
- **Spacing:** 4/8px rhythm. Data-dense → tighter padding than marketing UI (`py-3/4` in rows, not `py-8`).
- **Elevation:** single subtle shadow scale; tint shadows to bg hue, no pure-black drops.

## 6. Non-negotiables (Pre-delivery)

- [ ] No emoji as icons — use **lucide-react** only, one family.
- [ ] Status conveyed by icon/text + color, never color alone.
- [ ] Text contrast ≥ 4.5:1 (light + dark, tested separately).
- [ ] Visible focus rings; full keyboard nav on tables/forms.
- [ ] Numeric columns use `tabular-nums`.
- [ ] Tables: server-side pagination, sortable headers w/ `aria-sort`, virtualized for long lists.
- [ ] Responsive at 375 / 768 / 1024 / 1440.
- [ ] `prefers-reduced-motion` respected; transitions 150–300ms.

## 7. Coding rules (FE consistency) — ENFORCED

> Goal: zero scattered custom styling. A new dev (or future session) writes a screen and it looks identical to every other screen **without inventing anything**. Violations are review blockers, not preferences.

### 7.1 Single source of styling

- **Tokens live in ONE file** (`resources/css/app.css`, the `:root`/`.dark` block from §3). Nowhere else defines colors.
- **NO raw hex / rgb in components.** `text-[#2563EB]`, `bg-[#ECFDF5]`, `style={{color:'#...'}}` → banned. Use semantic classes: `text-primary`, `bg-card`, `text-muted-foreground`, `border-border`.
- **NO arbitrary Tailwind values** for spacing/size/color (`p-[13px]`, `w-[417px]`, `gap-[7px]`). Use the scale (`p-3`, `p-4`, `gap-2`). Arbitrary value = must be justified in PR.
- **NO inline `style={{}}`** except for genuinely dynamic values (e.g. a computed chart bar width). Static styling is always a class.

### 7.2 Components: reuse before create

- **Use shadcn/ui primitives** (`Button`, `Card`, `Badge`, `Table`, `Dialog`, `Input`…). Do **not** hand-roll a button/modal/dropdown that shadcn already provides.
- **Check before building:** search `resources/js/components/ui/` and `resources/js/components/` first. Extend existing, don't fork.
- **Variants via `cva`**, not conditional className soup. A button with 5 looks = 5 `cva` variants in one place, not `className={cond ? "..." : "..."}` scattered per call-site.
- **One shared layout shell** (sidebar + topbar). Pages render *into* it; pages never re-implement nav/chrome.

### 7.3 Status colors = one helper, never repeated

Status styling appears on every screen (deals, leads, tasks…). Define it **once** and import:

```ts
// resources/js/lib/status.ts — the ONLY place status→style is mapped
export const dealStatus = {
  won:     { label: 'Won',     class: 'text-[--won] bg-emerald-50',  icon: CheckCircle },
  pending: { label: 'Pending', class: 'text-amber-600 bg-amber-50',  icon: Clock },
  lost:    { label: 'Lost',    class: 'text-red-600 bg-red-50',      icon: XCircle },
} as const
```
- ❌ Banned: re-deciding "won = green" inline in each component. Map keys must match the domain enum in [`crm-business-rules`](./crm-business-rules.md) (state transitions).

### 7.4 Patterns that MUST be shared (build the abstraction, don't repeat)

| Recurring UI | Single shared component | Don't |
|---|---|---|
| Data table (sort, paginate, empty, loading) | `<DataTable>` wrapping TanStack Table | re-wire TanStack per page |
| KPI card | `<StatCard label value trend />` | bespoke divs per dashboard |
| Status pill | `<StatusBadge status />` (uses §7.3) | inline colored spans |
| Page header (title + actions) | `<PageHeader>` | ad-hoc flex rows |
| Empty / loading / error states | `<EmptyState> <Skeleton> <ErrorState>` | blank screens or raw spinners |
| Form field (label+input+error) | `<Field>` (RHF + Zod, label above) | placeholder-as-label |

Rule: **a UI pattern appearing on a 3rd screen must become a shared component** before that 3rd use ships.

### 7.5 Numbers, dates, money

- Money/quantity columns: always `tabular-nums` + a shared `formatCurrency()` / `formatNumber()` (locale-aware). No `.toFixed()` scattered in JSX.
- Dates via one `date-fns` wrapper (`formatDate`, `formatRelative`), not per-component formatting.

### 7.6 Review gate (block PR if any fails)

- [ ] No raw hex / arbitrary color values in changed files (`grep -rE '#[0-9a-fA-F]{6}|text-\[|bg-\['` → empty in components).
- [ ] No hand-rolled equivalent of an existing shadcn primitive or shared component.
- [ ] New recurring pattern extracted to a shared component (not copy-pasted).
- [ ] Status/format logic imported from the single helper, not re-implemented.
- [ ] Spacing/radius from the scale; light + dark both rendered.

## Related

- [`system-architecture.md`](./system-architecture.md) — frontend stack & component choices
- [`crm-actors-and-use-cases.md`](./crm-actors-and-use-cases.md) — who uses which screens
- Live swatch preview: [`../plans/visuals/blue-primary-swatches.html`](../plans/visuals/blue-primary-swatches.html)
