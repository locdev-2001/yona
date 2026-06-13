# Feature Flow Documentation (MANDATORY)

> Goal: anyone (human or a future session) returning to a feature can understand **how it works end-to-end — the operational flow — without reading all the code first.** Code says *what*; these docs say *who triggers it, what happens, in what order, what data changes, and why*.

**This is a HARD GATE, not a nicety.** A feature is **not done** until its flow doc is created/updated in the *same* change. Phase 4 (Verify) does not pass with stale docs. Treat a missing/outdated flow doc as a failing test.

## Source-of-truth docs (keep living, never let drift)

The project maintains a small set of living docs as the single source of truth. Adapt names to the project; typical set:

| Doc | Owns |
|---|---|
| `docs/<domain>-definition.md` | Entities, relationships, the ubiquitous language |
| `docs/<domain>-business-rules.md` | Ownership/visibility, invariants, state-transition rules |
| `docs/<domain>-actors-and-use-cases.md` | Actors, jobs-to-be-done, user stories, high-level flows |
| `docs/system-architecture.md` | System design, data flow, integration points |
| `docs/features/<module>/<feature>.md` | **Per-feature operational flow** (see template) |

Cross-link aggressively. A term defined once must not be re-defined elsewhere (DRY) — link to its source of truth.

## When you MUST update docs (triggers)

Update in the **same commit/PR** as the code whenever you:
- Add or change a feature's behavior, trigger, or steps.
- Change the data model, an entity, or a field (→ definition / field docs).
- Change a business rule, a permission, or a state transition (→ business-rules).
- Add/change an actor or role (→ actors-and-use-cases).
- Add an integration, webhook, queue job, or external call (→ system-architecture + feature doc).
- Discover an edge case during build/red-team (→ feature doc "Edge cases").

If a change touches **security/permissions, money, or the data model**, doc update is non-negotiable.

## Per-feature flow doc — required structure

Location: `docs/features/<module>/<feature>.md`. Keep tech-agnostic where possible; name concrete code entry points so devs can jump in.

```markdown
# <Feature name>

Module: <module> · Status: <draft|live> · Updated: <date>

## Purpose
One-paragraph: what this feature does and the value (link the relevant user story).

## Actors & permissions
Who can trigger it, at what scope/permission level. Link the business-rules doc.

## Trigger / entry points
What starts the flow (UI action / API route / webhook / cron / system event) + code path(s): `path/to/file:fn`.

## Operational flow (step-by-step)
Numbered: actor action → system step → data read/written (which entities, scoping) → side effects (events, notifications, jobs). Include a Mermaid diagram (see below).

## Data touched
Entities & fields read/written; access scoping; audit-log entries written.

## State transitions
If the feature changes a status, show before→after and the guard rules.

## Business rules applied
Bullet the invariants enforced (link business-rules). What is rejected and why.

## Edge cases & error handling
Failure modes, empty/None states, concurrency, isolation traps, rollback behavior.

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
