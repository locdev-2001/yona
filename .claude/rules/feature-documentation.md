# Feature Flow Documentation (MANDATORY)

> Goal: anyone (human or a future session) returning to a feature can understand **how it works end-to-end — the operational flow — without reading all the code first.** Code says *what*; these docs say *who triggers it, what happens, in what order, what data changes, and why*.

**This is a HARD GATE, not a nicety.** A feature is **not done** until its flow doc is created/updated in the *same* change. Phase 4 (Verify) of `crm-build-pipeline.md` does not pass with stale docs. Treat a missing/outdated flow doc as a failing test.

## Source-of-truth docs (keep living, never let drift)

| Doc | Owns |
|---|---|
| `docs/crm-domain-definition.md` | Entities, relationships, the ubiquitous language |
| `docs/crm-business-rules.md` | Ownership/visibility, invariants, state-transition rules |
| `docs/crm-actors-and-use-cases.md` | Actors, JTBD, user stories, high-level UC flows |
| `docs/crm-field-dictionary.md` | Field-level definitions, validation, custom-fields |
| `docs/system-architecture.md` | System design, data flow, integration points |
| `docs/features/<module>/<feature>.md` | **Per-feature operational flow** (see template) |

Cross-link aggressively. A term defined in domain-definition must not be re-defined elsewhere (DRY) — link to it.

## When you MUST update docs (triggers)

Update in the **same commit/PR** as the code whenever you:
- Add or change a feature's behavior, trigger, or steps.
- Change the data model, an entity, or a field (→ domain-definition / field-dictionary).
- Change a business rule, ownership/visibility, or a state transition (→ business-rules).
- Add/change an actor, role, or permission (→ actors-and-use-cases).
- Add an integration, webhook, queue job, or external call (→ system-architecture + feature doc).
- Discover an edge case during build/red-team (→ feature doc "Edge cases").

If a change touches **tenancy, RBAC, money, or the data model**, doc update is non-negotiable.

## Per-feature flow doc — required structure

Location: `docs/features/<module>/<feature>.md` (e.g. `docs/features/deal/move-deal-stage.md`). Keep tech-agnostic where possible; name concrete code entry points so devs can jump in.

```markdown
# <Feature name>

Module: <lead|contact|deal|activity|ticket|marketing|admin> · Status: <draft|live> · Updated: <date>

## Purpose
One-paragraph: what this feature does and the value (link the user story in actors-and-use-cases).

## Actors & permissions
Who can trigger it, at what visibility scope (own/team/all). Link crm-business-rules §Ownership.

## Trigger / entry points
What starts the flow (UI action / API route / webhook / cron / system event) + code path(s): `path/to/file:fn`.

## Operational flow (step-by-step)
Numbered: actor action → system step → data read/written (which entities, tenant_id scoping) → side effects (events, notifications, jobs). Include a Mermaid sequence or flowchart diagram (see below).

## Data touched
Entities & fields read/written; tenant_id / owner_id / team_id scoping; audit-log entries written.

## State transitions
If the feature changes a status (lead stage, deal stage, ticket SLA…), show the before→after and the guard rules.

## Business rules applied
Bullet the invariants enforced (link crm-business-rules). What is rejected and why.

## Edge cases & error handling
Failure modes, empty/None states, concurrency, tenant-isolation traps, rollback behavior.

## Related
Links to domain entities, related features, ADRs.
```

## Diagrams (required for any multi-step feature)

- Embed a **Mermaid** diagram in the flow doc — `sequenceDiagram` for actor↔system interactions, `flowchart`/`stateDiagram-v2` for branching/state. Use the `mermaidjs-v11` skill for correct v11 syntax.
- The diagram must match the written steps; if they diverge, the doc is wrong.

## Discoverability

- Maintain `docs/features/README.md` — an index: module → feature → one-line purpose → link. Add the row when you create a feature doc.
- Every feature doc links back up to its module and to the domain docs. Returning later = open the index, find the feature, read the flow + diagram, then the code.

## Anti-patterns (rejected in review)

- Code merged with no flow doc, or a doc that only restates field names without the *flow*.
- Diagram that contradicts the steps, or steps that omit data/side-effects.
- Re-defining a domain term locally instead of linking the source of truth.
- "Will document later" — later never comes; the doc ships with the feature.
