<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use App\Models\Reminder;

/**
 * Expose the reminders polymorphic relation on any workspace entity.
 * Business logic (create/update/delete/dispatch) lives in ReminderService.
 *
 * @phpstan-require-extends Model
 */
trait HasReminders
{
    /** @return MorphMany<Reminder, $this> */
    public function reminders(): MorphMany
    {
        return $this->morphMany(Reminder::class, 'remindable');
    }
}
