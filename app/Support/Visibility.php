<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use App\Models\TeamClosure;
use App\Models\WorkspaceMember;

/**
 * Record gate (BR-X02): resolves what a member can see — own | team-subtree |
 * all — and is the single chokepoint for scoping collection queries. Runs
 * INSIDE the already workspace-scoped query (global scope + RLS). Single records
 * use Policies; collections use scopeFor().
 */
class Visibility
{
    /** Visibility level for a member's role. */
    public static function level(WorkspaceMember $member): string
    {
        return match ($member->role) {
            'admin' => 'all',
            'sales_manager', 'support_manager' => 'team',
            default => 'own',
        };
    }

    /**
     * The member's team + all descendant team ids (manager rollup) via the
     * closure table. Empty when the member has no team.
     *
     * @return list<string>
     */
    public static function visibleTeamIds(WorkspaceMember $member): array
    {
        if (! $member->team_id) {
            return [];
        }

        return TeamClosure::query()
            ->where('ancestor_id', $member->team_id)
            ->pluck('descendant_id')
            ->all();
    }

    /**
     * Apply the member's visibility scope to a query over a model carrying
     * owner_id + team_id columns.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public static function scopeFor(Builder $query, WorkspaceMember $member): Builder
    {
        $table = $query->getModel()->getTable();

        return match (self::level($member)) {
            'all' => $query,
            'team' => $query->whereIn("{$table}.team_id", self::visibleTeamIds($member)),
            default => $query->where("{$table}.owner_id", $member->user_id),
        };
    }
}
