<!-- Title: conventional commit style, e.g. "feat(sales): deal stage transitions" -->

## Summary
<!-- What & why, in 1–3 lines. Link the issue: Closes #123 -->

## Scope
- [ ] Backend (Laravel) · [ ] Frontend (Inertia/React) · [ ] DB migration · [ ] Infra/CI · [ ] Docs

## Changes
<!-- Bullet the notable changes -->
-

## Business rules / docs touched
<!-- BR-* affected, docs updated. Per feature-documentation rule, flow docs ship WITH the feature. -->
- BR:
- Docs: <!-- system-architecture / feature doc / changelog -->

## Migrations & data
- [ ] No migration
- [ ] Forward-only, reversible
- [ ] Backfill plan: <!-- ... -->

## Testing
<!-- Pest/Playwright added or updated; how verified -->
-

## Checklist
- [ ] Tenant/workspace isolation respected (no unscoped query)
- [ ] AuthZ (role + Policy own/team/all) enforced
- [ ] Pint + Larastan + Pest pass locally
- [ ] Docs / changelog updated (feature flow doc if a feature)
- [ ] No secrets committed
