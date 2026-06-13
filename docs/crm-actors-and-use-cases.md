# CRM — Actors & Use Cases

> Tech-agnostic. Who uses the CRM, their jobs-to-be-done, and the core user stories per module.
> Companion to [crm-domain-definition.md](crm-domain-definition.md).

Date: 2026-06-13 · Status: living

---

## 1. Actors (roles)

| Actor | Description | Primary jobs-to-be-done (JTBD) |
|---|---|---|
| **Sales Rep** | Front-line seller. Owns leads & deals. | Work my pipeline, log activity, never lose a follow-up, close deals |
| **Sales Manager** | Leads a sales team. | See team pipeline, forecast, reassign work, coach reps, spot stalled deals |
| **Support Agent** | Resolves customer issues. | Triage tickets, resolve within SLA, see customer history |
| **Support Manager** | Leads support team. | Monitor SLA breaches, queue load, CSAT, reassign tickets |
| **Marketer** | Runs campaigns, feeds leads. | Capture/segment leads, run campaigns, measure source quality, hand qualified leads to sales |
| **Tenant Admin** | Configures the workspace for one tenant. | Manage users/teams/roles, configure pipelines & custom fields, set permissions, view audit log |
| **System (AI/automation)** | Non-human actor (future). | Score leads, suggest next action, auto-route, draft messages, escalate |

> Tenant = one customer organization. All actors operate **inside one tenant** — never across tenants.

---

## 2. Visibility & permission matrix (high level)

Visibility resolves by **role × record ownership** (own / team / all). `✓` = allowed, `own`/`team`/`all` = scope.

| Capability | Sales Rep | Sales Mgr | Support Agent | Support Mgr | Marketer | Tenant Admin |
|---|---|---|---|---|---|---|
| View leads/contacts/deals | own | team | read (linked) | read | own/segments | all |
| Create/edit deals | own | team | — | — | — | all |
| Reassign owner | — | team | — | team | — | all |
| View/handle tickets | linked | team-read | own | team | — | all |
| Run campaigns | — | — | — | — | ✓ | all |
| Configure pipeline/fields | — | — | — | — | — | ✓ |
| Manage users/roles | — | — | — | — | — | ✓ |
| View audit log | — | own team | — | own team | — | all |
| Export data | own | team | — | team | segments | all |

(Authoritative rules live in [crm-business-rules.md](crm-business-rules.md) §Ownership/Visibility.)

---

## 3. User stories by module

Format: *As a `<actor>`, I want `<goal>`, so that `<value>`.*

### Lead management
- As a **Marketer**, I want to capture leads from a form/import, so that no inbound interest is lost.
- As a **System**, I want to score & route a new lead to the right rep, so that hot leads get fast follow-up.
- As a **Sales Rep**, I want to see my assigned leads with score & source, so that I prioritize the best ones.
- As a **Sales Rep**, I want to qualify a lead (→ contact + account + deal), so that a real opportunity enters the pipeline.
- As a **Sales Manager**, I want duplicate leads flagged/merged, so that the team doesn't double-work a prospect.

### Contact & Account
- As a **Sales Rep**, I want one timeline of every interaction on a contact, so that I'm never out of context.
- As a **Sales Rep**, I want to see all contacts under an account, so that I understand the buying committee.
- As a **Tenant Admin**, I want to merge duplicate contacts/accounts, so that data stays clean.
- As a **Support Agent**, I want the contact's open deals & past tickets, so that I support them in context.

### Deal & Pipeline
- As a **Sales Rep**, I want to drag a deal across stages, so that I keep the pipeline current.
- As a **Sales Rep**, I want a required "next task" on each open deal, so that nothing stalls silently.
- As a **Sales Manager**, I want a weighted forecast (value × stage probability), so that I can commit a number.
- As a **Sales Manager**, I want stalled-deal alerts (no activity in N days), so that I can intervene.
- As a **Sales Rep**, I want to mark Won/Lost with a reason, so that we learn from outcomes.

### Activity & Task
- As any **user**, I want to log calls/emails/meetings/notes against a record, so that history is complete.
- As a **Sales Rep**, I want my tasks with due dates in one list, so that I work the right things today.
- As a **System**, I want to auto-create a follow-up task after an activity, so that momentum is preserved.

### Support / Ticket
- As a **Support Agent**, I want incoming tickets triaged by priority with an SLA clock, so that I meet commitments.
- As a **Support Manager**, I want SLA-breach warnings, so that I can reassign before we miss.
- As a **Support Agent**, I want to link a ticket to a contact/account, so that history carries over.
- As a **Support Manager**, I want CSAT after resolution, so that we measure quality.

### Marketing
- As a **Marketer**, I want to segment contacts/leads by attributes, so that I target the right audience.
- As a **Marketer**, I want to run a campaign and log sends/opens, so that I attribute leads to source.
- As a **Marketer**, I want source→deal→won reporting, so that I know which channels produce revenue.

### Reporting & Admin
- As a **Sales Manager**, I want dashboards (pipeline, conversion, activity), so that I run the team on data.
- As a **Tenant Admin**, I want to configure pipelines, stages & custom fields, so that the CRM fits our process.
- As a **Tenant Admin**, I want an audit log of changes, so that we have traceability & compliance.
- As a **Tenant Admin**, I want role/team management, so that people see only what they should.

---

## 4. Primary use-case flows

### UC-1 Lead → Won (happy path)
Capture lead → score & route → rep qualifies → Contact+Account+Deal created → activities logged, tasks worked → deal moves stages → **Won** → handoff to onboarding/support.

### UC-2 Inbound support
Ticket created (linked to contact) → triaged by priority, SLA clock starts → agent works → resolved within SLA → CSAT sent → history retained on contact.

### UC-3 Admin onboarding a tenant
Admin invites users → creates teams → assigns roles → configures pipeline & stages → defines custom fields → sets visibility defaults → imports existing data.

### Edge cases to design for (feed Phase 1.5 red-team)
- Lead with no owner / round-robin exhausted.
- Deal reassigned mid-stage (ownership + visibility change).
- Contact belongs to multiple deals across different reps.
- Account merge with conflicting custom-field values.
- Ticket SLA paused (waiting on customer) vs running.
- User deactivated while owning open records (reassignment rule).

---

**Related:** [crm-domain-definition.md](crm-domain-definition.md) · [crm-business-rules.md](crm-business-rules.md) · [crm-field-dictionary.md](crm-field-dictionary.md)
