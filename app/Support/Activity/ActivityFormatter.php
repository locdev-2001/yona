<?php

namespace App\Support\Activity;

use App\Models\Activity;
use Illuminate\Support\Facades\Log;

/**
 * Renders an Activity into a human-readable message using i18n keys.
 *
 * action key pattern: "lead.created" → lang/vi/activity.php key 'lead.created'
 * Payload values substituted as :param placeholders.
 * Fallback: returns raw $action + logs a warning when key missing.
 */
class ActivityFormatter
{
    /**
     * Render the activity into a translated message string.
     */
    public function format(Activity $activity): string
    {
        $params = array_merge(
            $activity->payload ?? [],
            ['actor' => $activity->actor_name ?? __('activity.system_actor')],
        );

        $key = "activity.{$activity->action}";
        $translated = __($key, $params);

        // __() returns the key itself when translation is missing
        if ($translated === $key) {
            Log::warning("ActivityFormatter: missing translation key [{$key}]", [
                'activity_id' => $activity->id,
                'action' => $activity->action,
            ]);

            return $activity->action;
        }

        return $translated;
    }

    /**
     * Serialize activity to an array suitable for React props.
     *
     * @return array<string, mixed>
     */
    public function toArray(Activity $activity): array
    {
        return [
            'id' => $activity->id,
            'action' => $activity->action,
            'message' => $this->format($activity),
            'payload' => $activity->payload,
            'actor_name' => $activity->actor_name,
            'visible_to_customer' => $activity->visible_to_customer,
            'occurred_at' => $activity->occurred_at->toISOString(),
        ];
    }
}
