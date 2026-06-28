<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Team;
use App\Services\TeamService;

/**
 * Move a team under a new parent (or to root). Rejects cycles at validation
 * (BR-X13): the new parent may not be the team itself or one of its
 * descendants. TeamService re-checks as a defensive backstop.
 */
class TeamReparentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.team.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Team $team */
        $team = $this->route('team');

        return [
            'parent_id' => [
                'nullable',
                'uuid',
                Rule::exists('teams', 'id')->whereNull('deleted_at'),
                function (string $attribute, mixed $value, \Closure $fail) use ($team) {
                    $descendants = app(TeamService::class)->descendantIds($team);
                    if ($value === $team->id || in_array($value, $descendants, true)) {
                        $fail(__('platform.teams.cycle_error'));
                    }
                },
            ],
        ];
    }
}
