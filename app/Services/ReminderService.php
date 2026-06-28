<?php

namespace App\Services;

use App\Notifications\EntityNotification;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Reminder;
use App\Models\Workspace;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;

/**
 * Manages Reminder lifecycle + the per-workspace scheduler dispatch.
 *
 * dispatchDue() note (G12 — Octane safety):
 *   This loop mutates the shared app container (app()->instance). It is safe in
 *   a non-Octane CLI scheduler (new process per invocation) or queue worker
 *   (separate process). If Octane is enabled, replace the loop with
 *   job-per-workspace: dispatch(new DispatchWorkspaceRemindersJob($wsId)) for
 *   each workspace ID so each job runs in a fresh container.
 */
class ReminderService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly PermissionRegistrar $registrar,
    ) {}

    /**
     * Create a new reminder for a subject entity.
     */
    public function create(
        Model $subject,
        User $recipient,
        Carbon|CarbonImmutable $remindAt,
        string $description,
    ): Reminder {
        return DB::transaction(function () use ($subject, $recipient, $remindAt, $description): Reminder {
            $reminder = new Reminder;
            $reminder->remindable_type = $subject->getMorphClass();
            $reminder->remindable_id = (string) $subject->getKey();
            $reminder->user_id = $recipient->getKey();
            $reminder->description = $description;
            $reminder->remind_at = $remindAt;
            // workspace_id stamped by BelongsToWorkspace::creating
            /** @var int|null $actorId */
            $actorId = auth()->id();
            $reminder->created_by = $actorId;
            $reminder->updated_by = $actorId;
            $reminder->save();

            return $reminder;
        });
    }

    /**
     * Update description and/or remind_at on an existing reminder.
     */
    public function update(Reminder $reminder, Carbon|CarbonImmutable $remindAt, string $description): void
    {
        DB::transaction(function () use ($reminder, $remindAt, $description): void {
            $reminder->remind_at = $remindAt;
            $reminder->description = $description;
            /** @var int|null $actorId */
            $actorId = auth()->id();
            $reminder->updated_by = $actorId;
            $reminder->save();
        });
    }

    /**
     * Soft-delete a reminder.
     */
    public function delete(Reminder $reminder): void
    {
        $reminder->delete();
    }

    /**
     * Scheduler entry-point: scan due reminders across all workspaces, fire
     * notifications, and mark is_notified=true.
     *
     * G12 isolation protocol:
     *  (1) Snapshot distinct workspace_ids BEFORE the loop (immutable list).
     *  (2) Per workspace: set RLS context, assert correctness, fetch+process, finally reset.
     *  (3) try/finally resets context even on exception (no cross-workspace leak).
     *
     * @param  list<string>|null  $workspaceIds  Explicit list for tests (avoids cross-connection
     *                                           transaction visibility issue). Production callers pass null — snapshot is read via the
     *                                           privileged connection which bypasses RLS.
     *
     * Returns the total number of notifications dispatched.
     */
    public function dispatchDue(?array $workspaceIds = null): int
    {
        // (1) Snapshot cross-workspace workspace IDs for due reminders.
        // Production: use privileged connection (bypasses RLS, reads all workspaces).
        // Tests: pass $workspaceIds explicitly to avoid cross-connection transaction
        //   visibility issue (Postgres READ COMMITTED — uncommitted rows on connection A
        //   are never visible to connection B, even in the same test).
        if ($workspaceIds === null) {
            /** @var list<string> $workspaceIds */
            $workspaceIds = DB::connection('pgsql_privileged')
                ->table('reminders')
                ->whereNull('deleted_at')
                ->where('is_notified', false)
                ->where('remind_at', '<=', now())
                ->distinct()
                ->pluck('workspace_id')
                ->all();
        }

        $dispatched = 0;

        foreach ($workspaceIds as $wsId) {
            /** @var Workspace|null $workspace */
            $workspace = Workspace::find($wsId);

            if ($workspace === null) {
                continue;
            }

            // (2) Establish workspace context for this iteration
            DB::statement("select set_config('app.current_workspace', ?, false)", [$wsId]);
            app()->instance('currentWorkspace', $workspace);
            $this->registrar->setPermissionsTeamId($wsId);

            try {
                // (3) Assert isolation — fail-fast before any notification fires
                $activeWs = currentWorkspace();
                if ($activeWs === null || $activeWs->id !== $wsId) {
                    throw new RuntimeException(
                        'Workspace context mismatch in ReminderService::dispatchDue(). '.
                        "Expected [{$wsId}], got [{$activeWs?->id}]."
                    );
                }

                // (4) Fetch due reminders scoped to this workspace (defense-in-depth:
                //     explicit workspace_id filter even though global scope is now active)
                $reminders = Reminder::query()
                    ->where('workspace_id', $wsId)
                    ->where('is_notified', false)
                    ->where('remind_at', '<=', now())
                    ->with('recipient')
                    ->get();

                foreach ($reminders as $reminder) {
                    /** @var Reminder $reminder */
                    $recipient = $reminder->recipient;
                    if (! ($recipient instanceof User)) {
                        continue;
                    }

                    $this->notifications->notify(
                        $recipient,
                        new EntityNotification(
                            action: 'reminder.due',
                            subject: $reminder,
                            payload: ['description' => $reminder->description],
                        ),
                    );

                    $reminder->forceFill([
                        'is_notified' => true,
                        'notified_at' => now(),
                    ])->save();

                    $dispatched++;
                }
            } finally {
                // (5) Reset context — always, even on exception (no cross-workspace leak)
                DB::statement("select set_config('app.current_workspace', '', false)");
                app()->forgetInstance('currentWorkspace');
                app()->forgetInstance('currentMembership');
            }
        }

        return $dispatched;
    }
}
