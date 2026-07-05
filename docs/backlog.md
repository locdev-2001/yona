# Backlog — GĐ1 & Future Phases

Hoãn + low-priority findings từ GĐ1 audit, để dành cho Phase-08+ hoặc future sprints.

## GĐ1 Audit Findings — Deferred (LOW priority)

### SendRateLimiter: Cap-race detection (Phase 4)

**Finding**: Current SendRateLimiter uses in-memory hash or Redis INCR. Under high concurrency (2+ requests same second for same peer_phone), a cap-check + increment can race:
1. Check: `remaining = 3 - cache.get(key)` → remaining = 1 ✓
2. Check: `remaining = 3 - cache.get(key)` → remaining = 1 ✓
3. Increment: `cache.set(key, 2)`
4. Increment: `cache.set(key, 2)` ← **Both won; cap bypassed**.

**Phase-07 mitigation**: Redis INCR is atomic, eliminating this on Redis. In-memory cache is single-process (dev/test); production uses Redis.

**Phase-08 hardening**: Add atomic check-and-increment primitive (Redis Lua script) to eliminate TOCTOU entirely.

**Related**: `modules/channel-zalo/src/Services/SendRateLimiter.php` line ~70.

---

### PostgreSQL superuser bypass (Non-superuser enforcement)

**Finding**: If `.env` APP_DB_USER is a PostgreSQL `superuser` role, RLS policies are **silently bypassed**. Default bootstrap users (e.g., `postgres`) bypass RLS. Production setup must use **non-superuser application role** (e.g., `crm_app`).

**Phase-07 mitigation**: None (manual bootstrap step).

**Phase-08 recommendation**: 
1. Add boot guard warning if `pg_roles.usesuper` for APP_DB_USER.
2. Seed `DatabaseUserNonSuperuserTest::testAppRoleNotSuperuser()` assertion during feature tests (fail if superuser detected).
3. Document in DEPLOYMENT.md: "Use non-superuser role for APP_DB_USER".

**Related**: [system-architecture.md](./system-architecture.md) § 4 Multi-tenant enforcement.

---

### Phone normalization & libphonenumber

**Finding**: Current implementation normalizes Vietnamese phone to '0xxx' string format (naive). Edge cases:
- +84 country code prefix (international format).
- Spacing, hyphens (user input typos).
- Invalid lengths or prefixes.

**Phase-07 status**: Works for Zalo webhook (bridge sends normalized '0xxx'). Manual contact entry allows typos.

**Phase-08 enhancement**:
1. Add `libphonenumber-php` dependency.
2. Implement `PhoneNormalizer` service: `normalizeVN($input) → '0xxx' | null`.
3. Use in IdentityResolver::resolveByPhone(), contact form validation, import CSV.
4. Add `PhoneNormalizerTest` (happy path + edge cases + invalid).

**Related**: `modules/cdp/src/Contracts/IdentityResolver.php`, Phase-08 cdp-dedup spec.

---

### Merge Identities: mergeIdentities() contract (Phase-08)

**Finding**: GĐ1 defines `IdentityResolver::mergeIdentities(primary_id, duplicate_id)` contract but no-op (Phase-07). Phase-08 must implement actual merge:

**Phase-08 implementation steps**:
1. Fetch both Contact records (lock both for update).
2. Repoint all references to duplicate → primary:
   - `Conversation.contact_id = duplicate_id` → primary_id
   - `Task.related_id` (if polymorphic to Contact)
   - `Activity.subject_id` (same)
3. Merge custom_fields (primary wins conflict).
4. Set duplicate `needs_merge_review = false`, mark soft-deleted or merged-into field.
5. Audit: `MergeIdentities` event + both contact IDs logged.
6. Idempotency: Check if already merged (via soft-delete or merged_into_id field).

**Related**: `modules/cdp/src/Contracts/IdentityResolver.php::mergeIdentities()`, conversation-to-lead doc.

---

### Contact Orphan Cleanup (Scheduled Task)

**Finding**: When Contact is created as draft (peer_phone null or contact creation without conversation link) and never linked to a Conversation or Lead, it becomes orphaned. Accumulates over time.

**Phase-08 housekeeping**:
1. Add scheduler job `CleanupOrphanDraftContacts::class` (nightly).
2. Delete Contact records WHERE:
   - `client_id IS NULL` (draft, not linked to Client)
   - `created_by` is system / automation (optional filter).
   - `updated_at < now() - 30 days` (older than threshold; configurable).
   - NOT referenced by any Conversation, Task, or Activity.
3. Log cleanup stats (count deleted).
4. Add toggle in EntitlementResolver or config: `contact.cleanup_orphans_enabled`.

**Related**: Phase-08 CDP dedup flow.

---

### Test Coverage: Impersonation + Dual-guard Session

**Finding**: GĐ1 fixed dual-guard session scope-bleed (shared cookie, intentional for impersonation). No test exists verifying impersonation state + end-state correctness.

**Phase-08 test addition**:
1. Add `tests/Feature/Admin/ImpersonationDualGuardTest.php`:
   - Admin logs in (admin guard active).
   - Admin starts impersonation (web guard bound to customer User).
   - Request made as web context (checks membership + RLS via web guard).
   - Admin guard still authenticated (allows admin actions if admin panel open in another tab).
   - End impersonation → web guard cleared, admin guard intact.
2. Assert: both guards' user IDs + permissions correctly scoped per request.

**Related**: `app/Support/TenantScope.php`, `HandleInertiaRequests::adminPayload()`.

---

## Phase-08 Priorities (Ordered)

**Critical (must-do before launch):**
1. Implement `IdentityResolver` phone dedup + mergeIdentities (GĐ1 depends on contract).
2. Add import CSV task (GĐ1 feature).
3. Implement PaymentProvider drivers (VNPay + MoMo).
4. Test suite for Zalo bridge + realtime (manual if no test account).

**High (post-launch acceptable):**
1. Quota configuration (founder decision) + validation test.
2. Phone normalization library integration.
3. Contact orphan cleanup scheduler.
4. Impersonation dual-guard test coverage.

**Medium (next phase):**
1. SendRateLimiter Lua script hardening.
2. PostgreSQL superuser check boot guard + test.
3. Webhook retry + backoff (currently simple).

**Low (nice-to-have):**
1. Advanced QR login (current: basic zca-js bridge).
2. Batch import status tracking + progress bar.
3. Custom phone validation regex per market.

---

## Known Limitations & Trade-offs (Documented)

### Zalo Personal Bridge: No Official API

GĐ1 uses **zca-js** (reverse-engineered Zalo client, unofficial). Limitations:
- **Risk**: Zalo ToS violation possible; account ban if detected.
- **Stability**: Bridge API may break on Zalo client update.
- **No 1:1 mapping to OA**: Zalo OA (official) would be more stable but requires test account (unavailable Phase-07).

**Mitigation**: Phase-08+ target Zalo OA migration when test account available. Current bridge documented as Phase-01 wedge. Bridge failure = graceful fallback (outbound disabled, inbound queued).

### Metering Period: Calendar Month (Not Rolling 30d)

`currentPeriod() = now('Asia/Ho_Chi_Minh')->format('Y-m')` = calendar month. Switching periods at midnight resets quota atomically.

**Trade-off**: Simpler than rolling window; predictable. Customer expects month-based billing.

### Free Defaults: PLACEHOLDER Numbers

`EntitlementResolver::FREE_DEFAULTS` hardcodes 50 conversations/month + 3 seats. Founder decision pending (~2026-07-07).

**Phase-08 change**: Update seed + constant, re-test EntitlementResolverTest.

---

## Dependencies & Blockers

| Item | Blocker | ETA |
|---|---|---|
| **GĐ1 launch** | Quota decision + Zalo test account | 2026-07-07 |
| **Phase-08 start** | GĐ1 launch green light | 2026-07-10 |
| **VNPay driver** | VNPay sandbox account + docs review | TBD |
| **MoMo driver** | MoMo sandbox account + docs review | TBD |
| **Import CSV** | Spec finalized (column mapping UI) | TBD |

---

## Reference

- **GĐ1 Audit Report**: 18 findings (critical/major/low) in `plans/260627-modular-standardization/reports/`.
- **Feature Docs**: [features/messaging/](./features/messaging/).
- **System Architecture**: [system-architecture.md](./system-architecture.md) § 3.6b.
- **Project Changelog**: [project-changelog.md](./project-changelog.md) § GĐ1 release.
