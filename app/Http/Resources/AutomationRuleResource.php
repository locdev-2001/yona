<?php

namespace App\Http\Resources;

use App\Models\AutomationRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/automation_rules/partials/_automation_rule.json.jbuilder.
class AutomationRuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var AutomationRule $rule */
        $rule = $this->resource;

        return [
            'id' => $rule->id,
            'account_id' => $rule->account_id,
            'name' => $rule->name,
            'description' => $rule->description,
            'event_name' => $rule->event_name,
            'conditions' => $rule->conditions ?? [],
            'actions' => $rule->actions ?? [],
            'created_on' => $rule->created_at?->getTimestamp(),
            'active' => (bool) $rule->active,
            'execution_delay' => $rule->execution_delay,
        ];
    }

    /** @param iterable<AutomationRule> $rules */
    public static function collectionFor(iterable $rules): array
    {
        return collect($rules)
            ->map(fn (AutomationRule $rule) => (new self($rule))->toArray(request()))
            ->values()
            ->all();
    }
}
