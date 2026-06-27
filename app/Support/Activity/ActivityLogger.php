<?php

namespace App\Support\Activity;

use App\Models\Activity;
use Modules\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

/**
 * Single entry-point for writing activity timeline entries (append-only).
 * Never call Activity::create() directly — always use this class.
 *
 * actor defaults to auth()->user() when null.
 * workspace resolved from currentWorkspace() (must be set before calling —
 * BelongsToWorkspace::creating stamps it; scheduler must set context first).
 */
class ActivityLogger
{
    /**
     * Log a single business action against a subject model.
     *
     * @param  array<string, mixed>  $payload
     */
    public function log(
        Model $subject,
        string $action,
        array $payload = [],
        bool $visibleToCustomer = false,
        ?User $actor = null,
    ): Activity {
        $resolvedActor = $actor ?? auth()->user();

        if (currentWorkspace() === null) {
            throw new RuntimeException(
                'ActivityLogger::log() requires an active workspace context (currentWorkspace() is null). '.
                'Set app.current_workspace before logging outside HTTP.'
            );
        }

        $activity = new Activity;
        $activity->subject_type = $subject->getMorphClass();
        $activity->subject_id = (string) $subject->getKey();
        $activity->actor_id = $resolvedActor?->id;
        $activity->actor_name = $resolvedActor?->name;
        $activity->action = $action;
        $activity->payload = $payload;
        $activity->visible_to_customer = $visibleToCustomer;
        $activity->occurred_at = now();
        // created_by = actor id (system column)
        $activity->created_by = $resolvedActor?->id;
        $activity->save();

        return $activity;
    }
}
