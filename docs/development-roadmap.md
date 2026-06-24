# Development Roadmap

> Living document — phases, milestones, progress. Maintained per `.claude/rules/documentation-management.md`. Pipeline defined in `crm-build-pipeline.md`.

Last updated: 2026-06-25

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

## Build sequence (Phase 3 — CRM Core M0+M1)

| # | Module | Status |
|---|---|---|
| 1 | Platform foundation (workspace, identity+membership, teams+closure, tenant isolation+RLS, RBAC, audit, time/locale, record numbers) | ✅ |
| 1b | **Admin plane** (two-guard `admin`, admin auth + RBAC, workspaces panel, Model-A impersonation, dual-actor audit, tenant signup, app-shell/UI refresh) | ✅ |
| 2 | **Custom-fields engine** (P02): JSONB-based, 5 entity types, GIN index, `CustomFieldService`, `HasCustomFields` trait, G6 morphism guard | ✅ |
| 3 | **Cross-cutting platform** (P03-05): attachments, tags, notes, comments, activity timeline, notifications, reminders, email templates, product announcements, pivot RLS (G4) | ✅ |
| 4 | **CRM core — Client/Contact/Lead/Pipeline/Convert** (P06-07): Clients + Contacts (primary contact, groups, vault, customer-admin), Leads pipeline kanban (G8), assignment notification, lost/junk, convert Lead→Client+Contact (G7: isolation+idempotency+rollback) | ✅ |
| 5 | **Projects & Tasks** (P08-09): Project + members + milestones kanban + file + discussions; Task multi-assignee + checklist + timer/timesheet (start/stop state machine) | ✅ |
| 6 | **Integration + Verify** (P10): cross-module tests (4×5 matrix), tenant isolation 2-workspace, authz matrix (401/403/404/ok), convert E2E, browser Playwright, docs gate | ✅ |
| 7 | Support (Ticket + SLA) | ⬜ |
| 8 | **Conversations / Inbox** (v1 core): live chat realtime, omnichannel web→Zalo/FB/email, escalate→Ticket | ⬜ |
| 9 | Marketplace + entitlements | ⬜ |
| 10 | Later: Marketing, Webhooks, inbound API, Import, Client Portal (M2) | ⬜ |

## Milestones

- **M1 — Platform MVP**: workspace + users/teams/roles, tenant-isolated, audited. (build 1–3) ✅
- **M1b — CRM Core (M0+M1)**: Client/Contact/Lead/Pipeline/Convert + Projects/Tasks + timers. (build 4–6) ✅ 2026-06-25
- **M2 — Client Portal**: Contact portal login (cột đã tạo ở P06 — password/email_verified_at), self-service view. ⬜
- **M3 — Support + Inbox**: tickets/SLA + realtime omnichannel live chat. (build 7–8) ⬜
- **M4 — Billing + Integrations**: marketplace live; Zalo/FB/email channels. (build 9–10) ⬜

## Success metrics (per milestone)
- Tenant-isolation tests pass (zero cross-workspace leak).
- All BR-* invariants covered by tests.
- Core flows (UC-1 lead→won, UC-2 support, UC-3 onboarding) working end-to-end.
