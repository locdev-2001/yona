# Development Roadmap

> Living document — phases, milestones, progress. Maintained per `.claude/rules/documentation-management.md`. Pipeline defined in `crm-build-pipeline.md`.

Last updated: 2026-06-28

## Status legend
✅ done · 🟡 in progress · ⬜ not started

## Phases

| Phase | Goal | Status |
|---|---|---|
| **0. Discovery** | Scope, stack, constraints | ✅ |
| **1. Domain Architecture** | Data model, contexts, auth, marketplace, foundations | ✅ |
| **1.5. Red-team** | Predict / scenario / security hardening | ✅ (folded into business-rules) |
| **2. Plan** | Phase files + TODOs in `plans/` | ✅ (Module 1 + admin plane + M0/M1 CRM) |
| **3. Build** | Implement (CRM-first) | ✅ P01–P09 complete |
| **4. Verify** | Tests → review → docs sync | ✅ P10 complete |

## Build sequence (Phase 3 → Phase 4: Modular standardization + GĐ1)

### Phase 3 completion (M1 — CRM Core)

| # | Module | Status |
|---|---|---|
| 1 | Platform foundation (workspace, identity+membership, teams+closure, tenant isolation+RLS, RBAC, audit, time/locale, record numbers) | ✅ |
| 1b | **Admin plane** (two-guard `admin`, admin auth + RBAC, workspaces panel, Model-A impersonation, dual-actor audit, tenant signup, app-shell/UI refresh) | ✅ |
| 2 | **Custom-fields engine** (P02): JSONB-based, 5 entity types, GIN index, `CustomFieldService`, `HasCustomFields` trait, G6 morphism guard | ✅ |
| 3 | **Cross-cutting platform** (P03-05): attachments, tags, notes, comments, activity timeline, notifications, reminders, email templates, product announcements, pivot RLS (G4) | ✅ |
| 4 | **CRM core — Client/Contact/Lead/Pipeline/Convert** (P06-07): Clients + Contacts (primary contact, groups, vault, customer-admin), Leads pipeline kanban (G8), assignment notification, lost/junk, convert Lead→Client+Contact (G7: isolation+idempotency+rollback) | ✅ |
| 5 | **Projects & Tasks** (P08-09): Project + members + milestones kanban + file + discussions; Task multi-assignee + checklist + timer/timesheet (start/stop state machine) | ✅ |
| 6 | **Integration + Verify** (P10): cross-module tests (4×5 matrix), tenant isolation 2-workspace, authz matrix (401/403/404/ok), convert E2E, browser Playwright, docs gate | ✅ |

### Phase 4 (Standardization + GĐ1: Omnichannel/CDP/Billing)

| # | Phase | Status |
|---|---|---|
| **0** | **Modular standardization (docs & plans)** — chuẩn hóa docs trước code; spec modular architecture, ADR, update roadmap/system-architecture | ✅ |
| **1** | **Module framework scaffold** — `modules/`, PSR-4, loader, `module.json`, topo-sort | ✅ |
| **2–6** | **Reorg current code → modular** (staged, test xanh): announcements, tenancy, identity, shared, cdp, crm-sales, projects | ✅ |
| **7** | **GĐ1 — Inbox + Channel-Zalo + CDP (contract) + Billing + Payment-manual** — inbox Zalo webhook + idempotent message, conv→Lead (dedup contract Phase-08), plan grant, metering per-channel, 18 audit findings fixed | ✅ |
| **7-Verify** | **GĐ1 Audit + Docs** — feature flow docs + system-architecture update + changelog + backlog; quotas PLACEHOLDER (founder decision), Zalo test account pending | ✅ |
| **8** | **GĐ1.5 — Import + Payment drivers** — import Excel/CSV, advanced QR login, VNPay/MoMo drivers | ⬜ (Phase-08) |
| (later) | Support (Ticket + SLA), Marketing, Webhooks, API, Client Portal | ⬜ |

**Plan:** [plans/260627-modular-standardization/plan.md](../../plans/260627-modular-standardization/plan.md)

## Milestones

- **M1 — Platform MVP**: workspace + users/teams/roles, tenant-isolated, audited. (Phase 3, build 1–3) ✅ 2026-06-13
- **M1b — CRM Core (M0+M1)**: Client/Contact/Lead/Pipeline/Convert + Projects/Tasks + timers. (Phase 3, build 4–6) ✅ 2026-06-25
- **Phase 4.0–4.7 — Modular standardization + GĐ1**: Code reorganization → modular monolith; Inbox Zalo + CDP dedup contract + Billing metering + 18 audit findings fixed (Phase-07 code-complete). ✅ 2026-06-28
  - Blockers to launch GĐ1 (Phase-08 start):
    1. **Quota PLACEHOLDER**: 3 gói (Free/Team/Business) còn chưa định số. Founder chốt trước tuần ~2026-07-07.
    2. **Zalo test account**: Bridge + realtime cần verify tay bằng personal Zalo account (QR login).
    3. **Phase-08**: Implement IdentityResolver (phone dedup), import CSV, payment drivers (VNPay/MoMo).
- **M3.5 — GĐ1.5**: Import + payment drivers (Phase 4.8 / Phase-08) ⬜
- **M4 — Support + Marketing**: Tickets/SLA + campaigns + scoring (Phase 5) ⬜
- **M5 — Client Portal**: Contact portal login + self-service views (Phase 6) ⬜

## Success metrics (per milestone)
- Tenant-isolation tests pass (zero cross-workspace leak).
- All BR-* invariants covered by tests.
- Core flows (UC-1 lead→won, UC-2 support, UC-3 onboarding) working end-to-end.
