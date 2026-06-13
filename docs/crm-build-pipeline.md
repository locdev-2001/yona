# Enterprise CRM — Build Pipeline (from zero)

The canonical workflow for building this CRM. Optimized for **correctness of the domain model first**, parallel execution second. Enforced via `.claude/rules/primary-workflow.md`.

## Principle

> In a CRM, the data model and domain boundaries are the foundation everything else rests on. A wrong model is the most expensive thing to fix later. Therefore: **architect and red-team before code (HARD GATE).**

YAGNI · KISS · DRY apply throughout. Don't build modules nobody asked for.

---

## Phase 0 — Discovery

**Goal:** Lock down *what* we're building and *for whom* before any design.

**Tools:** `brainstorm`, `research`, `ask`

**Decide:**
- Target users & jobs-to-be-done (sales team? support? both?)
- Core modules in scope vs out of scope (lead, contact, account, deal/pipeline, activity, ticket, report…)
- Multi-tenancy model (single-tenant / row-level / schema-per-tenant)
- AuthN/AuthZ needs (RBAC granularity, SSO, audit requirements)
- Scale posture (users, records, peak load — rough orders of magnitude)
- Integrations (email, telephony, payment, webhooks, import/export)
- Tech stack (only decide once needs are clear — not before)

**Output:** `plans/{date}-{slug}/reports/discovery.md` — scope doc + non-goals.

## Phase 1 — Domain Architecture ⭐

**Goal:** The system's backbone. Get this right; everything else follows.

**Tools:** `backend-architect` (global skill, built for CRM/SaaS)

**Produce:**
- Entity/data model + relationships (ER) and key invariants
- Bounded contexts / module boundaries
- Transaction & consistency strategy (where strong vs eventual)
- Audit log / soft-delete / history strategy (CRM needs traceability)
- Multi-tenant isolation mechanism
- Async/queue points, observability hooks
- Scale posture & known bottlenecks

**Output:** `docs/system-architecture.md` (living) + ADR notes for big decisions.

## Phase 1.5 — Red-team (before committing the design)

**Goal:** Break the design on paper, not in production.

**Tools:** `ck-predict` (5-persona debate), `ck-scenario` (edge cases ×12 dims), `ck-security` (STRIDE/OWASP)

**Check:** data-model holes, RBAC bypass, tenant data leakage, migration/scale traps, GDPR/PII handling. Feed findings back into Phase 1 until stable.

## Phase 2 — Plan

**Goal:** Turn the architecture into executable phase files.

**Tools:** `planner` agent → `ck-plan` → `plans-kanban`

**Output:** `plans/{date}-{slug}/plan.md` + `phase-XX-*.md` with TODOs, file lists, success criteria, **file-ownership map for parallel build**.

## Phase 3 — Build (pipeline)

**Goal:** Implement per plan. This is where parallelism pays off.

**Tools:** `fullstack-developer` ×N (parallel), per project rules

**Rules:**
- Each dev owns **distinct files** — no overlapping edits (see `team-coordination-rules.md`).
- Compile/typecheck after each file change.
- Implement real code — no mocks/stubs to fake progress.
- Update existing files; don't spawn `*-enhanced` variants.

## Phase 4 — Verify

**Goal:** Prove it works before merge.

**Tools:** `tester` → `code-reviewer` → `docs-manager`

**Gate:** all tests pass (never disable to go green) → review clean → docs (`system-architecture.md`, `project-changelog.md`, `development-roadmap.md`) updated.

---

## When to skip phases

- Trivial mechanical change (rename, copy fix, config tweak) → go straight to Phase 3, state that you skipped.
- Bug fix → use `ck-debug` / `fix`, then Phase 4.
- Everything that touches the **data model, auth, tenancy, or money** → full pipeline, no skipping.
