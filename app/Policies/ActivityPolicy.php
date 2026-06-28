<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Activity;

/**
 * Activity authorization.
 *
 * Activities are append-only and written ONLY via ActivityLogger (internal service).
 * HTTP layer exposes viewAny/view only — no create/update/delete routes exist.
 * The immutable guard in Activity::booted() is the code-level fence; this policy
 * is the HTTP gate.
 *
 * Visibility fail → abort(404) (non-enumeration, BR-X15).
 */
class ActivityPolicy
{
    /**
     * Any active workspace member may view the activity timeline.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Any active workspace member may view a single activity entry.
     */
    public function view(User $user, Activity $activity): bool
    {
        return true;
    }
}
