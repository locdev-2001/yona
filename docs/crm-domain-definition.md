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

```
┌─────────┐   convert    ┌──────────┐
│  LEAD   │ ───────────▶ │ CONTACT  │  person, qualified
│ unquali-│              └────┬─────┘
│ fied    │                  │ N  belongs to  1
└─────────┘             ┌────▼─────┐  1   N  ┌─────────┐
                        │ ACCOUNT  │◀────────│  DEAL   │  sales opportunity
                        │ company  │         └────┬────┘
                        └──────────┘              │ in one stage of
                                             ┌────▼─────┐
                                             │ PIPELINE │
                                             └──────────┘
   ACTIVITY / TASK  ── attached to ─▶  Lead | Contact | Account | Deal
```

### Entity definitions

| Entity | Definition | Key fields (domain) |
|---|---|---|
| **Lead** | One person at one company who *might* buy. Lives isolated until qualified. | name, email, phone, company, source, status, score |
| **Contact** | A qualified person your team actively engages. Backbone — every interaction ties to a Contact. | name, email, phone, title, account_id |
| **Account** | A company you have/pursue a relationship with. (Contact = person, Account = organization.) | name, domain, industry, size, owner |
| **Deal** (Opportunity) | A single sales opportunity, moving through pipeline stages. | name, value, currency, stage, expected_close, account_id |
| **Pipeline** | An ordered set of stages a Deal moves through. Configurable per team. | name, stages[], is_default |
| **Stage** | One step in a pipeline (e.g. Qualified → Proposal → Won/Lost). | name, order, probability, pipeline_id |
| **Activity** | A logged interaction: call, email, meeting, note. Polymorphic link. | type, subject, body, occurred_at, related_to |
| **Task** | A to-do with owner + due date (often the next action on a Deal/Contact). | title, due_at, status, assignee, related_to |
| **Ticket** (support) | A customer issue/request tracked to resolution with SLA. | subject, status, priority, contact_id, sla_due |

### Critical relationships & invariants

- **Account ↔ Contact = 1:N** — one company, many people.
- **Deal ↔ Account = N:1** — a deal belongs to one company.
- **Deal ↔ Contact = N:N** — model the *buying committee* (multiple decision-makers). Use a join (`deal_contact_roles`: contact_id, deal_id, role). **B2B-critical — do not collapse to 1:N.**
- **Lead is separate from Contact** — keep the funnel measurable and the clean data uncontaminated. On qualify → convert spawns Contact (+ optional Account + Deal).
- **Activity/Task = polymorphic** — attaches to any of Lead/Contact/Account/Deal.
- Every tenant-scoped record carries `tenant_id` + `owner_id` + `team_id` (see RBAC).

### Design traps to avoid

1. Merging Lead and Contact → lose conversion funnel, pollute clean data.
2. Deal–Contact as 1:N → can't model multi-stakeholder B2B deals.
3. Hardcoded pipeline/stages → each sales team needs its own.
4. No audit trail from day 1 → enterprise needs "who changed what, when".

---

## 4. Lifecycle (lead-to-customer funnel)

```
Stranger → Lead → (qualify) → Contact + Account
                                  │
                                  ▼ create
                                Deal → moves through Pipeline stages
                                  │
                          ┌───────┴───────┐
                       Won (customer)   Lost (archived, reasons logged)
                          │
                          ▼
                  Onboarding → Support (Tickets) → Renewal / Upsell
```

Every transition logs Activities; AI/automation can act on these events.

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
  Campaign·Segment·Scoring         Workflow engine (later) · AI agents (future)
```

Platform layer (RBAC, audit, custom fields, realtime, reporting, API) is as much work as the business layer — don't underestimate it. Detailed contexts & tables: [system-architecture.md](system-architecture.md); access planes: [crm-authorization-model.md](crm-authorization-model.md); inbox: [crm-conversations-inbox.md](crm-conversations-inbox.md).

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
