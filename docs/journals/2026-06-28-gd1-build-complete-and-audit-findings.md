# GĐ1 Build Complete + Audit Findings: Seam & Reachability Lessons

**Date**: 2026-06-28 08:36
**Severity**: High/Critical (findings, now fixed)
**Component**: CDP + Inbox + Channel-Zalo + Billing
**Status**: Resolved (code-complete + audited on main)

## What Happened

GĐ1 hit code-complete on commit 30562e7 (2026-06-28). All 5 modules shipped:
- **CDP**: phone-based identity dedup (IdentityResolver, Contact.client_id nullable)
- **Inbox**: Conversation/Message core + realtime + conversation→Lead flow
- **Channel-Zalo**: bridge port (zca-js) + inbound webhook + outbound send + QR login + rate-limiting + circuit-breaker
- **Billing**: per-channel conversation metering + entitlements framework + manual payment driver (VNPay/MoMo to follow)

Then came a **5-dimension adversarial audit** (RLS/isolation/metering/Zalo-safety/data-integrity) which exposed **18 findings**. 18 of them real, 2 bác bỏ. All real ones fixed on main. But two lessons hurt.

## The Brutal Truth

The code shipped. Tests passed. Linting passed. Then the audit—which wasn't automation, was a human thinking like an attacker—found:

1. **Quota gate was wired wrong**: ZaloSendService had `canStartNew()` logic that checked metering, calculated if a new outbound crossed the limit, and... did nothing. Entire `if (! canStartNew(...)) { /* TODO: billing will wire this */ }` was a comment. No exception thrown. Tenant at quota could send unlimited messages. A revenue-breaking bug hidden behind a "per-sub-step test pass" false confidence.

2. **UI shipped unreachable**: Inbox page (controller, route, Pest tests, React component) all shipped. Worked fine in unit tests. But the sidebar nav never got wired. Users couldn't click to Inbox. Same with Zalo settings—QR login page existed but wasn't linked from the settings nav. A user would have empty Inbox, no way to connect Zalo, and would think the feature is broken.

The painful part: every sub-phase had passing tests. Per-component verify meant nothing. The liar was in the seams.

## Technical Details

**CRITICAL Quota Bug (7d-2 → 7e-1)**
- 7d-2 (ZaloSendService::send) left a hook: `if (! canStartNew(...)) { // billing checks here }`
- 7e-1 (billing phase) built ConversationMeter logic, wrote unit tests, tests passed
- But no one wired the exception throw into ZaloSendService
- Result: `canStartNew()` was dead code; metering calculated but discarded; tenant went unlimited on outbound
- Audit adversarial test: "create 10 messages in 1 conversation at 3/month quota" → all 10 sent, no 422 error (should reject after 3)

**Unreachable UI (a490e94, 5e657c8)**
- Inbox: `/inbox` route + InboxController + resources/js/pages/Inbox.tsx — all there, `make test` green
- But `resources/js/components/app-sidebar.tsx` never added the nav item → dead link
- Zalo settings: `/settings/zalo-connections` + ZaloConnectionController + resources/js/pages/Settings/ZaloConnections.tsx — all there
- But `resources/js/layouts/settings/layout.tsx` never linked it → no way to reach QR page
- `npm run build` would have caught missing imports (if those components used dependencies); but nav wiring isn't a build error, it's a reachability UX bug

**Bridge Fail Not Graceful (f80fcb8)**
- ZaloConnectionController proxied to Node bridge (:3710) without ConnectionException handling
- If bridge down (port unreachable), raw cURL error leaked to UI
- Fixed: catch ConnectionException → friendly 503 + still soft-delete the connection (idempotent)

## What We Tried

1. **Per-phase automated tests**: Pest (billing, metering, inbox logic) + unit tests + integration tests. All green.
2. **Code review**: Looked at feature structure, data model, scoping. Missed the hook gap.
3. **Final linting + stan**: Type checking, style. Didn't catch dead code or missing nav wires.

None of it caught the **between-the-seams** bugs. Per-component green = per-component correct, but says nothing about "did you wire them together?"

## Root Cause Analysis

Two distinct root causes:

### 1. Integration Seam Verification Gap

The quota bug occurred because:
- 7d-2 left an intentional no-op hook ("billing will handle this")
- 7e-1 implemented metering but never tested it in the actual call path (ZaloSendService::send)
- No end-to-end test enforcing "if quota exceeded, ZaloSendService::send throws"
- Verification was: "does metering math work in isolation?" ✓ | "does send path respect metering?" ✗ (never asked)

**Lesson**: A no-op hook with a TODO comment is a synchronization point. Someone has to own "glue the two sides together" and test it end-to-end. Passing both ends' unit tests does not prove the seam is connected.

### 2. UI Feature Reachability Not in Verify Gate

The Inbox/Zalo nav bugs occurred because:
- Frontend build verification only checked PHP (make migrate, make test, make stan, make pint-test)
- Forgot that "route exists" != "user can reach it"
- The nav wiring is not a TypeScript compile error (dynamic object keys, conditional renders don't break tsc)
- Only a human test or a "verify all routes in sidebar map to actual pages" check would catch it

**Lesson**: Shipping a feature is not "code compiles + tests pass"; it's "user can navigate to it + it works". Verify gate must include:
- `npm run build` (vite) to catch missing dependencies and export mismatches
- A manual smoke test or checklist: "can I click to every new page from the UI?"

## Lessons Learned

1. **No-op hooks are a commit point, not a "figure it out later"**: When you write `// TODO: billing will fill this`, add a failing test that depends on the hook being filled. Mark the todo in a tracking list. Don't assume the next phase will remember.

2. **Seam verification is distinct from component verification**: After building a multi-phase feature, run an adversarial end-to-end test that ignores the unit-test boundaries and asks "do the invariants hold across the entire flow?" (example: hyphothetical adversary tries to overflow quota → verify they hit the real 422, not a comment).

3. **Verify gate = code + frontend + navigation**: A feature is done when (a) code compiles and tests pass, (b) frontend builds without warnings/errors, (c) there's a clickable path from the main UI to the feature. Three different tools, three different blind spots.

4. **Audit-by-refutation works**: Instead of "does this look right?", ask "what would break this?" The quota bug was invisible to normal review. The reachability bug was invisible to linting. Adversarial thinking found both.

## Next Steps

**Done (on main):**
- Quota enforcement hooked (ZaloSendService checks ConversationMeter + throws QuotaExceededException)
- Inbox + Zalo nav wired
- Bridge connection error handling graceful (503 vs. raw error)
- 4 more HIGH severity fixes (webhook scope-leak, metering atomicity, conv→Lead uniqueness, phone-race transaction)

**Blockers to launch (not blocking this entry):**
- Quota values (50/1000/5000) still PLACEHOLDER; founder needs to sign off
- No live Zalo test account yet (realtime/QR only mocked)
- Phase-08 (import + payment drivers) not started

**Process change**: Next phase, verify gate includes `npm run build` before code review. Adversarial audit is now baked into the workflow (not optional).

**Related**: [[integration-seam-end-to-end-verify]], [[build-verify-gate-frontend]]
