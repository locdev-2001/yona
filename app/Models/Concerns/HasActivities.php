<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use App\Models\Activity;
use App\Support\Activity\ActivityLogger;

/**
 * Expose the activities polymorphic relation and a convenience logger shortcut.
 * Business logic lives in ActivityLogger — NEVER in this trait.
 *
 * @phpstan-require-extends Model
 */
trait HasActivities
{
    /**
     * All activity entries for this model, newest first.
     *
     * @return MorphMany<Activity, $this>
     */
    public function activities(): MorphMany
    {
        return $this->morphMany(Activity::class, 'subject')->latest('occurred_at');
    }

    /**
     * Convenience: log an activity on this model without importing ActivityLogger directly.
     */
    public function logActivity(
        string $action,
        array $payload = [],
        bool $visibleToCustomer = false,
    ): Activity {
        return app(ActivityLogger::class)->log($this, $action, $payload, $visibleToCustomer);
    }

    /**
     * Human-readable name of this entity for activity payloads.
     * Override in consuming models (Lead, Client, Project, Task…).
     */
    public function activitySubjectName(): string
    {
        return class_basename($this).' #'.($this->getKey() ?? '?');
    }
}
