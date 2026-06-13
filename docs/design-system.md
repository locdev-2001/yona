# Chó Rách Management — Design System

> Single source of truth for visual design. Living doc. Cross-links: [`system-architecture`](./system-architecture.md) (§9b Frontend stack), [`crm-domain-definition`](./crm-domain-definition.md), [`crm-business-rules`](./crm-business-rules.md).
> Status: live · Updated: 2026-06-13

## 1. Direction

**Style:** Modern Soft-Neutral SaaS Dashboard — *airy, scannable, calm*. Reference: Relatel/microdose task dashboard (floating app-shell, grouped sidebar, soft cards). Content stays information-rich, but the chrome breathes.

- Building blocks: KPI stat cards w/ inline sparklines · data tables · kanban pipeline · grouped sidebar nav · command palette · breadcrumb + global search · view-switcher tabs (Spreadsheet/Board/Calendar/Timeline) · avatar stacks · filter bars.
- **Feel:** floating white app-shell on a light-gray canvas · generous whitespace · **soft tinted shadows** · large corner radius · neutral grayscale base so status + accent colors pop.
- **Avoid:** cramped/tight enterprise padding, ornate/marketing aesthetics, heavy gradients, hard pure-black drop shadows, color used only for decoration.
- Every functional color carries meaning (status) + always paired with icon/text, never color-alone.

Stack (per [`system-architecture`](./system-architecture.md) §9b): **shadcn/ui (Radix + Tailwind v4)** · TanStack Table v8 · dnd-kit · lucide-react · sonner · Recharts (charts/sparklines).

## 2. Color

Neutral grayscale is the canvas; **Blue 600 = primary**, **Violet = data-viz/accent**, status colors signal state. Base "disappears" so signals read instantly.

### Primary — Blue 600

| Scale | Hex | | Scale | Hex |
|---|---|---|---|---|
| 50  | `#EFF6FF` | | 500 | `#3B82F6` |
| 100 | `#DBEAFE` | | **600** ★ | **`#2563EB`** |
| 200 | `#BFDBFE` | | 700 | `#1D4ED8` |
| 300 | `#93C5FD` | | 800 | `#1E40AF` |
| 400 | `#60A5FA` | | 900 | `#1E3A8A` |

- **Primary** `#2563EB` · **Hover/active** `#1D4ED8` (700) · **Focus ring** `#2563EB` · **Subtle bg/accent** `#EFF6FF` (50).
- Dark mode: lift primary to `#3B82F6` (500) for contrast parity on dark surfaces.
- **Dark action button** (ref's "Create task"): an optional near-black variant `--foreground`/slate-900 is allowed for a single high-emphasis CTA per screen, when blue would compete with surrounding blue accents. Default CTA stays blue.

### Accent — Violet (data-viz only)

Drives charts, sparklines, heatmap bars, progress fills — the "lively" layer that keeps the neutral UI from feeling flat. **Not** a second brand/primary color: never use for buttons, links, or focus rings.

| Role | Hex |
|---|---|
| Violet (primary series / fills) | `#8B5CF6` violet-500 |
| Violet deep (emphasis) | `#7C3AED` violet-600 |
| Violet subtle (bg/heatmap floor) | `#F5F3FF` violet-50 |

**Two-series chart palette:** Violet `#8B5CF6` + Amber `#F59E0B` (ref burndown). Sequential heatmap: violet-100 → violet-600.

### Status (fixed — never reassign)

| Role | Fg | Bg (subtle) |
|---|---|---|
| Won / Success | `#059669` emerald-600 | `#ECFDF5` |
| Pending / Warning | `#D97706` amber-600 | `#FFFBEB` |
| Lost / Danger | `#DC2626` red-600 | `#FEF2F2` |
| Info | `#0EA5E9` sky-500 | `#F0F9FF` |

Priority flags (kanban/tasks) reuse status fg: **Urgent** = red-600, **Normal** = amber-600, **Low** = emerald-600 — flag icon + label, never color alone.

### Neutrals — Slate

Canvas (behind shell) `#E9EBF0` · App-shell/Card `#FFFFFF` · Text `#0F172A` · Muted text `#64748B` · Border (hairline) `#E2E8F0`.

## 3. shadcn/ui tokens

`--canvas` = the light-gray desk the white app-shell floats on. App-shell, cards, and popovers are white, separated by hairline border + soft shadow (§5).

```css
:root {
  --canvas:#E9EBF0;
  --background:#FFFFFF;  --foreground:#0F172A;
  --card:#FFFFFF;        --card-foreground:#0F172A;
  --primary:#2563EB;     --primary-foreground:#FFFFFF;
  --secondary:#F1F5F9;   --secondary-foreground:#0F172A;
  --muted:#F1F5F9;       --muted-foreground:#64748B;
  --accent:#EFF6FF;      --accent-foreground:#1D4ED8;
  --chart-1:#8B5CF6;     --chart-2:#F59E0B;     /* violet + amber series */
  --destructive:#DC2626; --destructive-foreground:#FFFFFF;
  --border:#E2E8F0;      --input:#E2E8F0;  --ring:#2563EB;
  --radius:1rem;         /* 16px — soft */
}
.dark {
  --canvas:#070B14;
  --background:#0B1220;  --foreground:#E2E8F0;
  --card:#111A2E;        --card-foreground:#E2E8F0;
  --primary:#3B82F6;     --primary-foreground:#0B1220;
  --secondary:#16213A;   --secondary-foreground:#E2E8F0;
  --muted:#16213A;       --muted-foreground:#94A3B8;
  --accent:#1E293B;      --accent-foreground:#93C5FD;
  --chart-1:#A78BFA;     --chart-2:#FBBF24;
  --destructive:#EF4444; --destructive-foreground:#0B1220;
  --border:#22304B;      --input:#22304B;  --ring:#3B82F6;
}
```

## 4. Typography

| Role | Font | Notes |
|---|---|---|
| Heading / Body | **Inter** | shadcn default; 16px base, line-height 1.5 |
| KPI numbers (stat cards) | Inter, **semibold ~32px**, `tabular-nums` | big & calm — the hero of each card |
| Numbers (tables, money) | Inter w/ **`tabular-nums`** | prevents column jitter — mandatory in data grids |
| Mono (IDs, code, logs) | **Geist Mono** / system mono | optional |

Type scale: `12 · 14 · 16 · 18 · 24 · 32`. Weight: body 400, labels 500, headings 600. Muted-gray (`--muted-foreground`) for labels/subtitles, full-contrast for values.

## 5. Shape, spacing & elevation

**Airy by default** — this is the biggest shift from a dense enterprise look.

- **Radius:** app-shell `1.25rem` (20px) · cards `--radius` 1rem (16px) · buttons/inputs `0.625rem` (10px) · pills/badges full. Pick from this scale, no in-between values.
- **Spacing:** 4/8px rhythm, **generous**. KPI cards `p-5`/`p-6`; section gaps `gap-6`; table rows `py-3` (rows stay efficient, chrome stays roomy). Sidebar nav items comfortable, not cramped.
- **Layout:** floating app-shell — white shell on `--canvas`, large radius + `shadow-lg`. Sidebar + topbar are the shell chrome; pages render *into* it and never re-implement chrome.
- **Elevation — soft tinted shadow scale** (no pure-black drops):

| Token | Use | Value |
|---|---|---|
| `shadow-xs` | hairline lift, resting inner cards | `0 1px 2px rgba(16,24,40,.04)` |
| `shadow-sm` | KPI/stat cards at rest | `0 1px 3px rgba(16,24,40,.06)` |
| `shadow-md` | dropdowns, popovers, hover | `0 4px 12px rgba(16,24,40,.08)` |
| `shadow-lg` | app-shell, dragged kanban card | `0 12px 32px rgba(16,24,40,.10)` |

Cards = hairline `border` **+** `shadow-sm`; don't rely on shadow alone.

## 6. Non-negotiables (Pre-delivery)

- [ ] No emoji as structural icons — use **lucide-react** only, one family. (Emoji allowed only as user content, e.g. task title.)
- [ ] Status/priority conveyed by icon/text + color, never color alone.
- [ ] Text contrast ≥ 4.5:1 (light + dark, tested separately).
- [ ] Visible focus rings; full keyboard nav on tables/forms.
- [ ] Numeric/KPI columns use `tabular-nums`.
- [ ] Cards use hairline border + soft shadow from the §5 scale — no ad-hoc shadow values.
- [ ] Violet is data-viz only — never on buttons/links/focus rings.
- [ ] Tables: server-side pagination, sortable headers w/ `aria-sort`, virtualized for long lists.
- [ ] Responsive at 375 / 768 / 1024 / 1440 (sidebar collapses; shell goes edge-to-edge on mobile).
- [ ] `prefers-reduced-motion` respected; transitions 150–300ms.
- [ ] Both **light + dark** rendered & contrast-checked separately (§9) — never assume light values work in dark.
- [ ] **No hard-coded user-facing strings** — every label/message comes from i18n (§10). Layout tolerates VI↔EN length shifts (VI ~+30%); no truncation of nav/buttons.

## 7. Coding rules (FE consistency) — ENFORCED

> Goal: zero scattered custom styling. A new dev (or future session) writes a screen and it looks identical to every other screen **without inventing anything**. Violations are review blockers, not preferences.

### 7.1 Single source of styling

- **Tokens live in ONE file** (`resources/css/app.css`, the `:root`/`.dark` block from §3). Nowhere else defines colors, radius, or shadow.
- **NO raw hex / rgb in components.** `text-[#2563EB]`, `bg-[#ECFDF5]`, `style={{color:'#...'}}` → banned. Use semantic classes: `text-primary`, `bg-card`, `text-muted-foreground`, `border-border`.
- **NO arbitrary Tailwind values** for spacing/size/color/radius/shadow (`p-[13px]`, `w-[417px]`, `rounded-[18px]`, `shadow-[...]`). Use the scale. Arbitrary value = must be justified in PR.
- **NO inline `style={{}}`** except for genuinely dynamic values (e.g. a computed chart bar width). Static styling is always a class.

### 7.2 Components: reuse before create

- **Use shadcn/ui primitives** (`Button`, `Card`, `Badge`, `Table`, `Dialog`, `Input`…). Do **not** hand-roll a button/modal/dropdown that shadcn already provides.
- **Check before building:** search `resources/js/components/ui/` and `resources/js/components/` first. Extend existing, don't fork.
- **Variants via `cva`**, not conditional className soup. A button with 5 looks = 5 `cva` variants in one place, not `className={cond ? "..." : "..."}` scattered per call-site.
- **One shared layout shell** (floating app-shell: sidebar + topbar). Pages render *into* it; pages never re-implement nav/chrome.

### 7.3 Status colors = one helper, never repeated

Status/priority styling appears on every screen (deals, leads, tasks…). Define it **once** with semantic classes (no raw hex — obeys §7.1) and import:

```ts
// resources/js/lib/status.ts — the ONLY place status→style is mapped
import { CheckCircle, Clock, XCircle } from 'lucide-react'
export const dealStatus = {
  won:     { label: 'Won',     class: 'text-success bg-success/10', icon: CheckCircle },
  pending: { label: 'Pending', class: 'text-warning bg-warning/10', icon: Clock },
  lost:    { label: 'Lost',    class: 'text-destructive bg-destructive/10', icon: XCircle },
} as const
```
- Map status fg/bg to semantic tokens (`success`/`warning`/`destructive`/`info`) defined once in `app.css`, not Tailwind palette names re-picked per component.
- ❌ Banned: re-deciding "won = green" inline in each component. Map keys must match the domain enum in [`crm-business-rules`](./crm-business-rules.md) (state transitions). Priority flags reuse the same helper.

### 7.4 Patterns that MUST be shared (build the abstraction, don't repeat)

| Recurring UI | Single shared component | Don't |
|---|---|---|
| Data table (sort, paginate, empty, loading) | `<DataTable>` wrapping TanStack Table | re-wire TanStack per page |
| KPI stat card (label + big value + delta + sparkline) | `<StatCard label value delta sparkline />` | bespoke divs per dashboard |
| Status / priority pill | `<StatusBadge status />` (uses §7.3) | inline colored spans |
| Page header (breadcrumb + title + actions) | `<PageHeader>` | ad-hoc flex rows |
| View switcher (Spreadsheet/Board/Calendar/Timeline) | `<ViewTabs>` | per-page tab markup |
| Kanban column + card | `<KanbanColumn>` / `<TaskCard>` (dnd-kit) | re-wire dnd per board |
| Avatar stack (+N overflow) | `<AvatarStack users max />` | manual overlap divs |
| Empty / loading / error states | `<EmptyState> <Skeleton> <ErrorState>` | blank screens or raw spinners |
| Form field (label+input+error) | `<Field>` (RHF + Zod, label above) | placeholder-as-label |

Rule: **a UI pattern appearing on a 3rd screen must become a shared component** before that 3rd use ships.

### 7.5 Numbers, dates, money

- Money/quantity columns: always `tabular-nums` + a shared `formatCurrency()` / `formatNumber()` (locale-aware). No `.toFixed()` scattered in JSX.
- Dates via one `date-fns` wrapper (`formatDate`, `formatRelative`), not per-component formatting.

### 7.6 Review gate (block PR if any fails)

- [ ] No raw hex / arbitrary value in changed files (`grep -rE '#[0-9a-fA-F]{6}|text-\[|bg-\[|rounded-\[|shadow-\[' resources/js` → empty in components).
- [ ] No hand-rolled equivalent of an existing shadcn primitive or shared component.
- [ ] New recurring pattern extracted to a shared component (not copy-pasted).
- [ ] Status/format logic imported from the single helper, not re-implemented.
- [ ] Spacing/radius/shadow from the scale; light + dark both rendered.
- [ ] Violet used for data-viz only.

## 8. Signature layout & components (from reference)

The look that defines the product — build these as the shared shell/components in §7.4:

- **App-shell:** light-gray `--canvas` background; white shell (`rounded-[1.25rem]` + `shadow-lg`) holding a fixed grouped **sidebar** + page area.
- **Sidebar:** logo + workspace name → grouped sections (`Overview` / `Tools` / `Metrics`) with section labels; nav items = icon + label + optional count/badge; active item = subtle filled pill (`bg-secondary`); user profile footer w/ menu. Collapsible.
- **Topbar:** breadcrumb (back chevron → trail) · global search w/ `⌘F` kbd hint · contextual actions (Manage/Share) · primary CTA.
- **KPI stat card:** muted label + icon · big `tabular-nums` value · colored delta (`↗ green` / `↘ red`) · inline sparkline (Recharts: scatter/bar/area) · `edit · expand · more` controls top-right.
- **Kanban:** column header = status icon + name + count + overflow menu. **Task card** anatomy: id chip (`MDS-39`) · priority flag badge · title · subtitle w/ small icon · due-date pill (calendar icon) · footer = avatar stack + comment count + date. Dragged card lifts to `shadow-lg`.

## 9. Theming — light & dark mode

Both themes are **first-class**, shipped together. Status: **implemented**.

- **Mechanism:** a `.dark` class on `<html>` toggles the `.dark` token block in `app.css` (§3). Every color is a semantic token, so components theme automatically — no per-component dark variants.
- **Modes:** `light` · `dark` · `system` (follows OS `prefers-color-scheme`). Persisted in `localStorage('appearance')`; applied pre-paint to avoid flash.
- **Code:** hook [`use-appearance`](../resources/js/hooks/use-appearance.tsx) (`useAppearance()` + `initializeTheme()`); switcher UI [`appearance-tabs`](../resources/js/components/appearance-tabs.tsx) / [`appearance-dropdown`](../resources/js/components/appearance-dropdown.tsx) (in Settings → Appearance and the user menu).
- **Dark is not inverted light** — surfaces use desaturated navy-slate, primary lifts Blue 600→500, chart accents desaturate (§2/§3). Test contrast in dark independently.
- **Rules:** never hard-code a color that only works in one theme; dividers/borders + hover/pressed/disabled states must stay visible in both; modal scrim strong enough in both (§6).

## 10. Internationalization — Vietnamese & English

Bilingual product: **`vi` (default) · `en`**, fallback `en`. Status: **to implement** (greenfield — no i18n yet).

- **Single source of strings = Laravel `lang/`** (DRY across web + emails + validation):
  - `lang/{vi,en}/*.php` (grouped keys) and `lang/{vi,en}.json` (flat UI strings). Backend uses `__('...')`.
  - Set `APP_LOCALE=vi`, `APP_FALLBACK_LOCALE=en` in env.
- **Frontend access (Inertia):** the active locale + its message bundle are shared via `HandleInertiaRequests::share()` → a thin `t(key, params)` helper (e.g. `laravel-react-i18n`) reads them in React. **No literal user-facing text in `.tsx`** — always `t('deals.create')`.
- **Locale resolution & switch:** per-user preference (column on `users`) → session → `Accept-Language` → default `vi`. A language switcher lives in the **user menu** (and on auth pages); switching `PUT /locale` persists + reloads shared props.
- **Formatting is locale-aware (ties to §7.5):** `formatCurrency` / `formatNumber` / `formatDate` take the active locale (`vi-VN` ↔ `en-US`). Currency stays VND unless product says otherwise; numbers keep `tabular-nums`.
- **Layout rule:** VI text runs ~30% longer than EN — nav, buttons, badges, table headers must wrap/flex, never fixed-width-truncate. Test both locales at 375px.
- **Pluralization & params:** use Laravel `trans_choice` / ICU-style params, not string concatenation.

## Related

- [`system-architecture.md`](./system-architecture.md) — frontend stack & component choices
- [`crm-actors-and-use-cases.md`](./crm-actors-and-use-cases.md) — who uses which screens
- Live swatch preview: [`../plans/visuals/blue-primary-swatches.html`](../plans/visuals/blue-primary-swatches.html)
