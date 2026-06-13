# Development Roadmap

> Living document — phases, milestones, progress. Maintained per `.claude/rules/documentation-management.md`. Pipeline defined in `crm-build-pipeline.md`.

Last updated: 2026-06-13

## Status legend
✅ done · 🟡 in progress · ⬜ not started

## Phases

| Phase | Goal | Status |
|---|---|---|
| **0. Discovery** | Scope, stack, constraints | ✅ |
| **1. Domain Architecture** | Data model, contexts, auth, marketplace, foundations | ✅ |
| **1.5. Red-team** | Predict / scenario / security hardening | ✅ (folded into business-rules) |
| **2. Plan** | Phase files + TODOs in `plans/` | ⬜ next |
| **3. Build** | Implement (Sales-first) | ⬜ |
| **4. Verify** | Tests → review → docs sync | ⬜ |

## Build sequence (Phase 3 — from system-architecture §12)

| # | Module | Status |
|---|---|---|
| 1 | Platform foundation (workspace, identity+membership, teams+closure, tenant isolation+RLS, RBAC, audit, time/locale, record numbers) | ⬜ |
| 2 | Custom-fields engine | ⬜ |
| 3 | Cross-cutting platform (attachments, notifications, event bus, **Reverb realtime**, product announcements) | ⬜ |
| 4 | Sales core (Account, Contact, Deal, Pipeline/Stage, roles; stage/won-lost/forecast) | ⬜ |
| 5 | Lead + conversion | ⬜ |
| 6 | Engagement (Activity, Task) | ⬜ |
| 7 | Support (Ticket + SLA) | ⬜ |
| 8 | **Conversations / Inbox** (v1 core): live chat realtime, omnichannel web→Zalo/FB/email, escalate→Ticket | ⬜ |
| 9 | Marketplace + entitlements | ⬜ |
| 10 | Later: Marketing, Webhooks, inbound API, Import | ⬜ |

## Milestones

- **M1 — Platform MVP**: a workspace with users/teams/roles, tenant-isolated, audited. (build 1–3)
- **M2 — Sales MVP**: full lead→deal→won funnel with activities/tasks. (build 4–6)
- **M3 — Support + Inbox**: tickets/SLA + realtime omnichannel live chat. (build 7–8)
- **M4 — Billing + Integrations**: marketplace live; Zalo/FB/email channels, more. (build 9–10)

## Success metrics (per milestone)
- Tenant-isolation tests pass (zero cross-workspace leak).
- All BR-* invariants covered by tests.
- Core flows (UC-1 lead→won, UC-2 support, UC-3 onboarding) working end-to-end.
