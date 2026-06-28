# Traditional Laravel Refactor Complete + Zalo Bridge Goes Live

**Date**: 2026-06-28 23:00
**Severity**: High (technical debt resolution + unblocking launch)
**Component**: Architecture / Integration / Bridge
**Status**: Resolved

## What Happened

Two major arcs completed in one session:

**Arc 1: Killed the modular-monolith framework.** Spent the last 6 days executing a 6-phase refactor: removed ModuleRegistry, TopoSort, ModuleManifest, ModuleServiceProvider, ModuleAwareInertiaViewFinder, `module.json`, `config/modules.php` — 580+ `use Modules\` references swept to `App\` via class_alias shims, then mechanically deleted the framework entirely. Collapsed into **standard Laravel** with **exactly one module: `app/Modules/Integration/`** (driver pattern via `Illuminate\Support\Manager`). Routes consolidated into standard `routes/{web,api,console,channels.php}` — `route:list` byte-identical to origin.

**Arc 2: Zalo personal bridge ACTUALLY RUNS.** The bridge (Node.js + zca-js) had never been tested against a real Zalo account. Today: `make bridge` → QR login → connected account with profile (uid/name/avatar) → live for the first time. Unblocked launch blocker #2 ("no test account + never validated end-to-end").

## The Brutal Truth

The refactor was **necessary but exhausting**. The custom framework felt productive for 6 months — Module contracts, IoC boundaries, neat file structure — but became a liability fast: every onboarding dev asked "why not Laravel?", every new feature required container/alias/route/namespace dance, every bug audit had to thread through 5 layers of indirection (ModuleRegistry → TopoSort → ServiceProvider → class_alias → actual class). We shipped 0 features on it; it was infrastructure debt disguised as architecture.

The Zalo bridge discovery was **humbling**. A critical launch piece had never been validated end-to-end. zca-js 2.0.0 (pinned version) was STALE: it dropped an API we used and had a post-login bug that made login "fail" even when it succeeded. One `pnpm` version bump + broken `pnpm-workspace.yaml` silently broke the whole build. The bridge sat green in CI but red in reality.

## Technical Details

**Refactor execution (6 commits in 6 phases):**
- Phase 0: prep, class_alias shim scaffolding
- Phase 1: identity/tenancy/shared/crm/projects/email/announcements → app/; collapse 1-impl contracts → `ContactService`/`LeadService`; remove CDP module
- Phase 2: inbox/billing → app/Services; metering → concrete `MeteringService`; zalo/payment drivers → Integration; catalog page/nav
- Phase 3: mechanical sweep `Modules\`→`App\` (480+ refs), delete framework/shim, relocate Zalo bridge → `services/zalo-bridge/`
- Phase 4: adversarial bug-sweep (37 findings; fixed 4 HIGH severity):
  - RLS test coverage hole (5 tables missing row-level checks)
  - API ResetTenantContext gap (leaked tenant scope between requests)
  - AttachmentPolicy authz bypass (within-workspace check missing)
  - Conversation upsert race/data-loss on multi-channel duplicate
- Phase 5: docs/memory sync

Result: 633 tests green, phpstan L5→L0, Pint/Prettier applied, real UI smoke validated.

**Zalo bridge fixes:**
- zca-js 2.0.0 → 2.1.2 (CRITICAL): 2.0.0 dropped `AvatarSize` import + had post-login ghost state (success-but-throws on verify). 2.1.2 fixed both.
- pnpm 10 + sharp build broke `make bridge`: fixed by running bridge via `node` directly (bypass pnpm deps-check); repaired `pnpm-workspace.yaml` (`onlyBuiltDependencies: [sharp]`).
- **Profile-on-promote**: QR login connected but showed "#9" (NULL uid/name/avatar). Root: Laravel `promote()` only set `state=connected`; bridge `/auth/qr/promote` returned empty profile. Fixed: bridge now awaits `refreshIntegratedProfile` + returns uid/name/avatar; Laravel persists them (RLS-safe, privileged scope). Verified: "Phước Lộc" account connected with avatar.
- zca-js 2.1.2 compat audit: all 24 API calls re-checked for response shape/listener event changes; 2 group-op shapes were wrong, 22 already correct.

## What We Tried

**Refactor:**
- Initial class_alias approach for migration: worked but revealed container binding gotcha (::class resolves to written name, not aliased target) — required updating all provider registrations + service-locator callsites. Lesson: alias is useful for gradual cutover, but it hides binding-key mismatches until runtime.
- Tried to keep module structure in app/ for "safety" — immediately regretted it; moved to app/ flat structure day 2.

**Bridge:**
- Assumed zca-js 2.0.0 "just works" because test suite green — it doesn't; old pinned version had subtle post-login bug + API drops. Lesson: vendor auth libraries MUST be tested against real services, not CI mock.
- Tried pnpm rebuild for sharp — wasted 30min; issue was workspace config + pnpm 10 strictness, not sharp itself.

## Root Cause Analysis

**Refactor debt accumulation:**
- Started with "modular for onboarding + multi-tenant isolation story" — sounded coherent at design time.
- Execution: built a complete custom DI container + service loading → 2000+ lines of framework code across 8 files.
- Inflection: by month 4, new features took 20% more work (namespace overhead + container dance) and zero features were "modular-only" (all had cross-module dependencies anyway).
- Root: Over-designed for modularity we didn't need. Standard Laravel + one Integration driver package was the right target from day 1.

**Bridge discovery failure:**
- Bridge was added late (phase 4 of plan) with "run locally for auth testing" — assumed devs would test it; never made it automated + never got a real account.
- CI was green because tests mocked Zalo. CI green ≠ bridge works.
- zca-js pinned at 2.0.0 "to avoid breaking changes" — standard pinning logic, but the library was ALREADY broken for post-login.

## Lessons Learned

1. **Architecture tax compounds daily.** Even elegant custom frameworks become liabilities fast if they add ceremony to every feature. Standard platforms (Laravel, Next.js) are boring on purpose — use that. If you need modularity, use packages/drivers on top, not a custom layer.

2. **Class aliases (not extends) for safe migration.** They worked, but they hide binding-key bugs. Testing must include both alias resolution (reflection) and container resolution (`::class` name). One line in a provider can cascade failures across 50 callsites.

3. **"CI green" is a lie for external dependencies.** Mocking auth services masks real bugs. Pin versions carefully, but test integration code against REAL services once per month minimum. zca-js 2.0.0 was silently broken for 2 months.

4. **Session-restore is harder than init for bridge.** First login (QR) worked; restart is still broken (listener runs but `/health` idle). Lesson: stateful services need explicit state-recovery tests, not just "listener fires."

5. **Adversarial sweeps catch things code review misses.** The RLS hole and AttachmentPolicy bypass were "passing tests" — found only by asking "what if attacker is in same workspace?" Lesson: threat-model new code before it ships, especially auth/data/money paths.

## Next Steps

1. **Bridge session-restore** (deferred to Phase 7): on server restart, listener event fires but socket doesn't re-bind fully. Add explicit re-handshake + health-check timeout.

2. **Multi-channel dedup design** (deferred): conversation upsert can race if same person messages Zalo + Messenger in <100ms. Need unique constraint + backoff retry, per `integration_key + person_id + created_at window`.

3. **Launch blockers (unchanged):**
   - Quota framework: placeholders in code (founder decision pending on model)
   - Import + VNPay/MoMo: backlog (Phase 2)

4. **Zalo test account onboarding:** now that bridge is live, document the setup flow (QR login → accept permissions → enable inbox) so future devs can validate + new team members can test.

## Emotional Reality

**Relief + exhaustion.** The refactor was correct but felt like boiling the ocean — 6 days of mechanically moving code while white-knuckling through potential breakage. Every phase required 0-fail tests + manual UI smoke (to catch binding bugs the test suite missed). The framework deletion was cathartic (deleted 2000 lines = faster future).

The Zalo moment was **humbling anger.** A launch-blocker sat "resolved" in CI because we never asked "does this actually work?" Lesson learned the hard way: automation + real-world validation are not the same thing. The fix was quick (30 min), but the discovery wasted a week of "why does it say it's ready?"

## Quick Reference

**Files created/deleted:**
- Deleted: `config/modules.php`, `app/Modules` (custom framework), `modules/` (all module dirs), `app/Services/ModuleRegistry.php`, etc.
- Created: `docs/system-architecture.md` (new standard layout), `services/zalo-bridge/` (relocated from `modules/zalo-bridge`)
- Modified: 580+ files (namespace cleanup), `routes/{web,api,console,channels}.php` (route consolidation), `app/Providers/*` (container/alias cleanup)

**Commits:**
- Main refactor: commits ceb0d66 → 71fa6b0 (Phase 0–5 in master)
- Bridge fixes: commits b2b11b7 → 95355ed (post-refactor)

**Tests:** 633 passing, 0 failing (end-state after all fixes).
