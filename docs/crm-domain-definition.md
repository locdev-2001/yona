# CRM — Domain Definition

> Tech-agnostic reference. Defines *what* a CRM is and the domain language for this project.
> Tech stack is decided later. Source of truth for terminology used across architecture, plans, and code.

Date: 2026-06-13 · Status: living · Owner: domain

---

## 1. What is a CRM

**CRM (Customer Relationship Management)** = the system + processes a business uses to manage every interaction with customers — from a stranger showing interest (lead) → buyer → ongoing relationship.

**2026 shift:** CRM is no longer just a *system of record* (stores data). It is becoming a *system of action* — it also *does work* (sends follow-ups, scores leads, progresses deals, escalates tickets), increasingly via AI agents. Our data model should leave room for this (event/activity stream as the backbone).

---

## 2. Three faces of CRM (we build all three)

| Type | Purpose | Examples in our scope |
|---|---|---|
| **Operational** | Automate sales / marketing / support workflows | Pipeline, activity tracking, campaigns, tickets |
| **Analytical** | Turn data into insight & forecast | Reports, dashboards, lead scoring, forecasting |
| **Collaborative** | Share customer context across teams | Shared timeline, internal notes, omnichannel inbox |

---

## 3. Core entities (the heart — get this right)

> **Quyết định khóa #2 (2026-06-25)**: Mô hình **Client/Contact/Lead/Pipeline** thay thế Account/Deal/Stage kiểu HubSpot. `accounts` và `deals` không tồn tại trong codebase. Lý do: SMB/B2C focus, simpler funnel, avoid overkill B2B buying-committee modeling cho giai đoạn hiện tại. Sẽ xem xét Deal trong M5+ nếu cần.

```
┌─────────┐   convert    ┌──────────┐
│  LEAD   │ ───────────▶ │ CONTACT  │  người liên hệ (Contact thuộc Client)
│ tiềm    │  (G7 TX)     └────┬─────┘
│ năng    │                  │ N  belongs to  1
└─────────┘             ┌────▼─────┐
                        │  CLIENT  │  công ty/tổ chức
                        │ (company)│
                        └──────────┘
Lead.pipeline_id → PIPELINE → PIPELINE_STAGES (open/won/lost)

ACTIVITY / TASK  ── attached to ─▶  Lead | Client | Contact | Project
PROJECT ── has many ─▶  PROJECT_MILESTONES, TASKS
```

### Entity definitions

| Entity | Definition | Key fields (domain) |
|---|---|---|
| **Lead** | Một người tại một công ty *có thể* mua. Funnel-isolated cho đến khi convert. | name, email, phone, company, source, pipeline_id, stage_id, is_public, lead_value |
| **Client** | Công ty/tổ chức có quan hệ kinh doanh. Source of truth cho relationship. | name, currency, billing_addr, leadid (link from Lead nếu convert) |
| **Contact** | Người làm việc trực tiếp thuộc Client. is_primary = đầu mối chính. | first_name, last_name, email, phone, client_id, is_primary |
| **Pipeline** | Bộ stages theo thứ tự Lead di chuyển qua. Cấu hình per workspace. | name, is_default |
| **Pipeline Stage** | Một bước trong pipeline. `type`: open/won/lost. | name, stage_order, probability, type |
| **Project** | Dự án gắn với Client, theo dõi tiến độ qua milestones và tasks. | name, client_id, status, progress, billing_type |
| **Task** | Công việc cần làm; gắn polymorphic với lead/client/project/contact. | name, status(1-5), priority(1-4), related_type, related_id |
| **Activity** | Hành động đã xảy ra — append-only, immutable. | action, subject_type/id, payload, occurred_at |
| **Ticket** (support) | Yêu cầu hỗ trợ cần giải quyết với SLA. (M3 — chưa build) | subject, status, priority, contact_id, sla_due |

### Critical relationships & invariants

- **Client ↔ Contact = 1:N** — một công ty, nhiều người liên hệ; đúng 1 là primary.
- **Lead → Client/Contact** — convert tạo Client + primary Contact trong 1 transaction (G7); idempotency guard.
- **Lead.stage_id ∈ Lead.pipeline_id** — stage PHẢI thuộc pipeline (G8, validated trong Service + FormRequest).
- **Lead is separate from Client/Contact** — funnel measurable; clean data không ô nhiễm.
- **Activity/Task = polymorphic** — gắn với Lead/Client/Contact/Project qua morph map (G3, alias ngắn).
- **Workspace isolation** — mọi entity có `workspace_id`; RLS default-deny + Eloquent global scope (BR-X01/X11).
- Mọi FK tới `users` là **bigint** (hybrid ID — quyết định 13a); mọi FK khác là **uuid**.

### Design traps (đã tránh)

1. Merging Lead + Contact → mất funnel analytics, ô nhiễm dữ liệu clean.
2. Account/Deal làm thêm tầng → overkill cho SMB; defer to M5+ nếu cần.
3. Hardcoded pipeline → mỗi workspace có pipeline riêng.
4. No audit trail → `activities` + `audit_logs` từ M1.
5. EAV cho custom fields → dùng JSONB (B3 reconciliation — KISS, DRY).

---

## 4. Lifecycle (lead-to-customer funnel)

```
Stranger → Lead → kanban drag stages → Won stage (G7 convert TX)
                                              │
                                              ▼
                                    Client (company) + Contact (person)
                                              │
                                    Projects assigned to Client
                                              │
                          ┌───────────────────┴───────────────────┐
                       Tasks (work units)               Support (Tickets) [M3]
                          │
                  Timers/Timesheet → Billing [M3]

       Lost → lead.is_lost=true (last_stage saved for restore)
       Junk → lead.is_junk=true (last_stage saved for restore)
```

Every transition logs Activities (append-only). AI/automation listens to events.

---

## 5. Module map (full enterprise CRM)

Three groups: customer-facing CRM, shared Platform foundation, and internal Platform-staff. 🟢 = free base · 🔵 = paid add-on (entitlement, see [crm-marketplace.md](crm-marketplace.md)).

```
CUSTOMER-FACING (workspace)        PLATFORM / SHARED                INTERNAL (platform staff)
───────────────────────────       ──────────────────────────       ──────────────────────────
Sales 🟢                           Multi-tenancy + Workspace         Workspace administration
  Lead·Contact·Account·Deal        Identity + Membership             Marketplace catalog mgmt
  Pipeline/Stage·Forecast          RBAC (roles·teams·visibility)     Billing / subscription ops
Engagement 🟢                      Custom Fields engine              Support impersonation (audited)
  Activity·Task                    Audit log + soft-delete
Support 🔵                         Attachments / files               COMMERCE
  Ticket·SLA·CSAT                  Notifications (+preferences)      ─────────
Conversations / Inbox              Product Announcements             Marketplace (add-ons)
  Live chat realtime 🟢            Realtime (Reverb)                 Entitlements
  Omnichannel: web·Zalo·FB·email   Reporting / BI                    Integrations (Zalo/FB/
  escalate → Ticket                API + Webhooks (event bus)          email/calendar/…)
Marketing 🔵
  Campaign·Segment·Scoring         Workflow engine (designed) · AI agents (future)
```

Platform layer (RBAC, audit, custom fields, realtime, reporting, API) is as much work as the business layer — don't underestimate it. Detailed contexts & tables: [system-architecture.md](system-architecture.md); access planes: [crm-authorization-model.md](crm-authorization-model.md); inbox: [crm-conversations-inbox.md](crm-conversations-inbox.md); automation/workflow engine: [crm-automation-workflow.md](crm-automation-workflow.md).

---

## 6. Glossary (project terminology)

| Term | Meaning |
|---|---|
| **Tenant** | One customer organization using our SaaS. Hard data boundary. Maps to an org in auth. |
| **Owner** | The user who owns a record (drives "my records" visibility). |
| **Team** | A group of users; drives "team records" visibility. |
| **Qualify** | The act of promoting a Lead to a Contact (+ optional Account/Deal). |
| **Pipeline** | Configurable ordered stages for deals. |
| **Stage** | One step in a pipeline, carries a win-probability. |
| **Win / Lost** | Terminal deal outcomes; Lost records a reason. |
| **Activity** | Any logged touchpoint (call/email/meeting/note). |
| **Custom field** | Tenant-defined extra field on a core entity (stored as JSONB). |
| **Visibility** | What records a user can see: own / team / all (by role). |
| **Audit log** | Immutable record of changes for traceability/compliance. |

---

## 7. References

- CRM data model: [Mria CRM](https://mriacrm.com/crm-data-model-explained-contacts-companies-deals-and-beyond/) · [Zoho core modules](https://zenatta.com/zoho-crm-core-modules/) · [Freshworks model](https://technoroots.org/insights/understanding-the-freshworks-crm-data-model-contacts-accounts-deals-and-how-they-connect-ALDyF)
- Module map: [Umbrex CRM playbook](https://umbrex.com/resources/the-customer-relationship-management-system-playbook/crm-modules-and-capabilities-map/)
- 2026 trends (system-of-action / agentic): [CX Today](https://www.cxtoday.com/crm/crm-trends-2026-customer-data/) · [Futurum](https://futurumgroup.com/insights/can-hubspots-agentic-ai-bet-disrupt-enterprise-crms-old-guard/)

---

**Related docs:**
- Actors, JTBD, user stories → [crm-actors-and-use-cases.md](crm-actors-and-use-cases.md)
- Business rules (BR-XXX) → [crm-business-rules.md](crm-business-rules.md)
- Field dictionary + enums → [crm-field-dictionary.md](crm-field-dictionary.md)
- Scope & locked decisions → [discovery.md](../plans/260613-1328-crm-foundation/reports/discovery.md)
- Build flow → [crm-build-pipeline.md](crm-build-pipeline.md)
