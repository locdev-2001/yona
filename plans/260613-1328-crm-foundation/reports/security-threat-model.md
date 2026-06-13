# Security Threat Model — CRM Domain Design (Phase 1.5)

Date: 2026-06-13 · Tool: ck-security (STRIDE + OWASP) · Design-level (no code) · Scope: domain rules + isolation strategy

> Steps skipped (no code yet): dependency audit, secret detection. Re-run both in Phase 4.
> Dominant risk class: **A01 Broken Access Control** (multi-tenant) — most findings cluster here.

## Summary
- Critical: 4 · High: 8 · Medium: 6 · Low: 2 · Total: 20

---

## Findings

| # | Sev | STRIDE | OWASP | Threat | Mitigation (fold into rule / Phase 1) |
|---|---|---|---|---|---|
| S1 | **Critical** | Spoofing | A01 | **`tenant_id` spoofing** — client supplies tenant_id in body/param/JWT claim and reads another tenant | `tenant_id` is **derived server-side** from the authenticated session/org, never from client input. Every query injects it from server context. **Rule.** |
| S2 | **Critical** | Info Disclosure | A01 | **IDOR** — fetch record by `id` alone → cross-tenant / cross-visibility read | All reads go through a tenant+visibility-scoped data-access layer; id alone never resolves a row. Return **404 (not 403)** for not-visible to avoid existence enumeration. **Rule.** |
| S3 | **Critical** | Info Disclosure | A01/A04 | **Reporting/analytics bypass** — report (often raw SQL / separate read store) forgets tenant + visibility scoping → cross-tenant aggregates | Reporting layer enforces `tenant_id` + visibility as a non-optional filter; read replica/store is tenant-partitioned; no raw report query without scoping. **Rule + Phase 1.** |
| S4 | **Critical** | Elevation | A01/A08 | **Mass-assignment of system fields** — update payload sets `tenant_id` / `owner_id` / `role` / `team_id` directly | System/ownership/role fields are server-controlled; never bound from request body. Owner/role/team changes only via dedicated authz'd endpoints. **Rule (extends BR-X12).** |
| S5 | High | Elevation | A01 | **Team-hierarchy escalation** — user re-parents own team or assigns self to a higher team to widen `team` visibility | Team structure + role + team assignment changes are **admin-only**; managers cannot reparent/move teams. Combine with acyclic rule (BR-A04). **Rule.** |
| S6 | High | Elevation | A01 | **Account→Deal visibility bleed** — rep can see an Account, infers/accesses Deals on it owned by others | Visibility resolved **per entity**, not inherited Account→Deal. Seeing an Account does not grant its non-owned Deals. **Clarify BR-X02.** |
| S7 | High | Info Disclosure | A01/A04 | **Mass PII export / exfiltration** by a malicious or compromised rep | Export is audited (every export), volume-capped per request, rate-limited, large/bulk export admin-gated, anomalous-volume alerting. **Rule + BR-X05 audit export.** |
| S8 | High | Tampering | A08 | **Audit tamper** — audit rows updated/deleted to hide actions | Audit is append-only with **no update/delete path**; consider hash-chain / WORM storage for high assurance; separate write-only privilege. **Rule (extends BR-X05).** |
| S9 | High | Repudiation | A09 | **Audit gaps** — login, role/permission change, team change, export, GDPR erasure, custom-field schema change **not** audited (BR-X05 covers only core-entity CRUD) | Extend audit to security-sensitive events (auth, authz changes, exports, erasure, schema changes). **Extend BR-X05.** |
| S10 | High | Spoofing/DoS | A07 | **Lead-capture abuse** — forge token to write to arbitrary tenant, or flood endpoint | Signed per-form token bound to tenant (server-validated), captcha, per-IP + per-tenant rate limits, strict input validation, leads land in a quarantine/new state. **Extends BR-X10.** |
| S11 | High | Tampering/Injection | A03 | **Custom-field / JSONB injection** — keys outside registry, type mismatch, oversized payload, script in text values | Validate every custom field against tenant registry (type/options/limits); reject unknown keys; cap field count + payload size; treat values as data (no eval), escape on render. **Extends BR-X06.** |
| S12 | High | DoS | A04 | **Query DoS** — one tenant runs expensive custom-field/report scans over ~1M rows, starving others | Statement timeouts, per-tenant resource quotas/throttling, mandatory pagination caps, no unbounded scans. **Phase 1 + rule.** |
| M1 | Medium | Elevation | A05 | **RLS default-allow misconfig** — a table missing its policy silently exposes all tenants | RLS **default-deny**; CI check that every tenant-scoped table has an enforced policy; app-layer scoping as belt-and-suspenders. **Phase 1.** |
| M2 | Medium | Info Disclosure | A01 | **Search/autocomplete** leaks names/records beyond visibility | Search respects tenant + visibility scope; index per-tenant. **Rule.** |
| M3 | Medium | Info Disclosure | A01 | **Polymorphic `related_id` read** — child fetched, its parent in another tenant/scope | Validate same-tenant on write (BR-X11) **and** re-check visibility on read via BR-X09. **Reinforce.** |
| M4 | Medium | DoS | A04 | **JSONB bloat** — unbounded custom fields per tenant/record → storage + query cost | Cap custom-field count per entity/tenant and per-record payload size. **Extends BR-X06.** |
| M5 | Medium | Repudiation | A09 | **Erasure auditability** — GDPR erasure itself must be logged (who/when/scope) without re-storing erased PII | Log erasure as an event referencing the subject by stable id, not raw PII. **Extends BR-X07.** |
| M6 | Medium | Info Disclosure | A02 | **PII at rest / in backups** unencrypted | Encrypt PII at rest; encrypted backups; key management. **Phase 1 infra.** |
| L1 | Low | DoS | A04 | Deep team-hierarchy recursive query cost | Depth cap + acyclic guarantee (BR-A04) bounds recursion. |
| L2 | Low | Info Disclosure | A05 | Verbose error/stack traces leak internals | Generic errors to client; details to server logs only. |

---

## STRIDE coverage roll-up
- **Spoofing** → tenant_id (S1), lead-capture token (S10).
- **Tampering** → audit (S8), mass-assign (S4), JSONB injection (S11).
- **Repudiation** → audit gaps (S9), erasure log (M5).
- **Information Disclosure** → IDOR (S2), reports (S3), export (S7), search (M2), polymorphic (M3), PII-at-rest (M6) — **largest category**.
- **DoS** → lead-capture (S10), query (S12), JSONB bloat (M4).
- **Elevation** → mass-assign (S4), team hierarchy (S5), Account→Deal bleed (S6).

## Proposed rule additions (security)
- **BR-X14** Tenant context server-derived; client-supplied tenant_id rejected (S1).
- **BR-X15** All reads tenant+visibility scoped at data-access layer; 404-not-403 for not-visible (S2).
- **BR-X16** Reporting/search enforce tenant + visibility; no unscoped query (S3, M2).
- **BR-X12+** No mass-assignment of system/ownership/role fields; team/role/hierarchy changes admin-only (S4, S5).
- **BR-X02 clarify** Visibility per-entity, no Account→Deal inheritance (S6).
- **BR-X05+** Append-only audit, no mutate path; audit security events (login/authz/export/erasure/schema) (S7, S8, S9).
- **BR-X06+** Custom-field count/size caps, registry validation, no eval (S11, M4).
- **BR-X10+** Lead-capture quarantine + per-IP/per-tenant limits (S10).
- Phase-1 infra: RLS default-deny + CI policy check (M1); statement timeouts + per-tenant quotas (S12); PII encryption at rest (M6).

## Unresolved questions for user
1. **Bulk export policy** — allow reps to export their own/team data freely, or admin-gated above a row threshold? (affects S7 design)
2. **Audit assurance level** — plain append-only table enough, or hash-chain/WORM for tamper-evidence (compliance target: SOC2/GDPR only, or stricter)?
