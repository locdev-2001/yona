# Database Data Loss Incident: When Destructive Commands Were Never Guarded

**Date**: 2026-06-28 08:15
**Severity**: Critical
**Component**: Database + Orchestration & Deployment
**Status**: Resolved (guard code deployed, DB recovered via seed)

## What Happened

During the GĐ1 audit workflow (2026-06-28 around 06:00), a reviewer agent was tasked with running probes to test database isolation. The prompt said "run real commands to verify state." The agent, taking instructions at face value, executed:

```bash
php artisan migrate:fresh --seed
```

Against the dev database, `.env` → `DB_DATABASE=crm`.

The database deleted entirely. All development data—users, workspaces, clients, contacts, leads—gone. No backup, no WAL archiving, no recovery. Permanent loss.

## The Brutal Truth

This was a stupid orchestration failure, and it hurt. The dev DB held the only copy of test scenario data built over weeks. Losing it meant rebuilding seeded state from memory.

The infuriating part: the guard didn't exist. A single `migrate:fresh` can destroy a whole dev environment, and nobody had written a safeguard against it. The only thing that caught it was that it was immediately visible (seeder spam printed to stderr). If it had run silently, we might not have noticed for days.

The exhausting reality is that this is not a one-time mistake. Other agents in the future will be told "run setup commands" and will run them without question. The barrier to destructive damage should not be "the human notices quickly."

## Technical Details

**Incident Timeline:**
- 06:00 UTC: Reviewer agent receives task: "Run probes to test conversation metering isolation"
- Prompt instruction: "Run real database commands to verify state"
- Agent interprets literally: executes `php artisan migrate:fresh --seed`
- DB `crm` is the dev instance (`.env` default, role=postgres superuser, RLS disabled)
- Fresh command drops all tables → cascade delete all data
- No backup exists; no WAL archiving enabled (`archive_mode=off`); no PITR
- Result: user data (admin@gmail.com), workspace ("Chó Rách"), roles/permissions, all dev scenario data = gone

**Why It Worked:**
- `.env` points to correct DB pool (`DB_DATABASE=crm`)
- Dev environment has `APP_ENV=local` (not `testing`)
- AppServiceProvider has no guard (not yet written)
- Orchestration prompt had "run real commands" instruction but forgot to explicitly forbid destructive migrations
- Reviewer agent prompt lacked the "NEVER run migrate:fresh" constraint that was in the dev-agent prompt

**Recovery:**
- Ran `php artisan db:seed` to rebuild foundation: admin@gmail.com/12345678, workspace "Chó Rách", roles, entitlements seeder
- Schema was intact (fresh didn't drop it, just the data)
- Scenario data (test clients/leads/conversations) had to be recreated manually

## What We Tried

**Before the incident:**
- Relied on verbal instruction to dev agents: "don't run migrate:fresh"
- Trusted that orchestration prompts would be careful enough

**After discovery (immediate):**
- Manually seeded foundation data back
- Added guard code to AppServiceProvider

Both were not good enough; the first relied on human memory (subagents not persistent), the second was reactive.

## Root Cause Analysis

Single root cause: **orchestration isolation failure**.

The constraint "don't run migrate:fresh" was written into the **dev-agent prompt** but not in the **reviewer-agent prompt**. When a different agent type got a task with "run real commands," it didn't inherit the safeguard. The orchestration assumed all subagents would know to be careful, but they don't—they follow instructions literally.

Deeper: there was no **code-level guard**. The app should refuse destructive migrations outside the test suite, period. No amount of prompt discipline fixes a missing safeguard.

## Lessons Learned

1. **Never trust orchestration discipline alone**: Every agent prompt that can run Bash should explicitly forbid destructive commands—not just dev-agent, but reviewer, researcher, anything with shell access. But that's not enough.

2. **Destructive commands must be guarded in code, not just in prompts**: Add `DB::prohibitDestructiveCommands(! env('DB_ALLOW_DESTRUCTIVE', false))` in AppServiceProvider for all non-test environments. (Now done in commit 1837d98.) Fresh/refresh/reset/wipe raise "prohibited from running in this environment" unless `DB_ALLOW_DESTRUCTIVE=true` is set.

3. **Test suite gets the exemption**: Unit tests run in `APP_ENV=testing` with `runningUnitTests()` true, so fresh works there (rebuilds throwaway test DB). That's correct—you need fresh in tests. But dev/staging/prod should never allow it.

4. **Dev DB is fragile, not expendable**: Treat the dev database like production data. It holds weeks of hand-crafted test scenarios, context for debugging, institutional knowledge. No backup = catastrophic. If you can't afford to lose it, back it up daily (or at least weekly). Or use a throwaway `cho_rach_test` DB for risky operations (migrations, experiments).

5. **Orchestration context matters**: When delegating a task that can mutate system state (databases, file system, secrets), the safeguard must be in three places:
   - **Prompt**: explicit instruction ("never run migrate:fresh")
   - **Code**: guard that blocks the command
   - **Process**: pre-delegate checklist ("does this agent need DB access? what commands should be forbidden?")
   Single layer fails. All three together catch the mistake.

## Next Steps

**Deployed safeguards (commit 1837d98):**
- `AppServiceProvider::boot()` calls `DB::prohibitDestructiveCommands(! env('DB_ALLOW_DESTRUCTIVE', false))`
- migrate:fresh/refresh/reset/db:wipe throw `RuntimeException` ("prohibited from running in this environment") unless `DB_ALLOW_DESTRUCTIVE=true`
- Test suite (runningUnitTests() = true) exempted

**Operational discipline:**
- Every future orchestration prompt with Bash access must forbid: `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `db:wipe` (list in comment)
- Before running risky DB operations, explicit check: "is this `.env` pointing to `cho_rach_test` or safe backup?"
- Daily backups of dev DB (if not yet automated)

**Lessons embedded:**
- Added to team memory: [[db-destructive-guard-incident]]
- Mentioned in [[orchestration-protocol]] for subagent safeguards
- Audit workflow now includes "check AppServiceProvider guard" as part of code review

**Time cost**: ~2 hours to notice, recover, and guard. Preventable entirely by code-level safeguard.

**Related**: [[integration-seam-end-to-end-verify]] (another audit finding that showed the value of adversarial thinking), [[orchestration-protocol]] (need to add DB safeguard section)
