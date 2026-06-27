<?php

namespace App\Services;

use App\Exceptions\TeamHierarchyException;
use App\Models\Team;
use Modules\Tenancy\Models\WorkspaceMember;
use Illuminate\Support\Facades\DB;

/**
 * Owns team-tree mutations + closure-table maintenance (BR-X02/X13). The
 * closure table gives O(1) subtree reads for manager visibility; this service
 * pays the write cost and guarantees acyclicity. All operations assume the
 * workspace context is established (RLS scopes every statement to it).
 */
class TeamService
{
    public function create(string $name, ?string $parentId = null, ?int $createdBy = null): Team
    {
        return DB::transaction(function () use ($name, $parentId, $createdBy) {
            $team = new Team(['name' => $name]); // workspace_id auto-stamped by trait
            $team->parent_id = $parentId;        // server-controlled (BR-X12)
            $team->created_by = $createdBy ?? auth()->id();
            $team->save();

            $workspaceId = $team->workspace_id;

            // self link (depth 0)
            DB::table('team_closure')->insert([
                'workspace_id' => $workspaceId,
                'ancestor_id' => $team->id,
                'descendant_id' => $team->id,
                'depth' => 0,
            ]);

            // inherit the parent's ancestor chain (each +1 depth)
            if ($parentId) {
                DB::insert(
                    'insert into team_closure (workspace_id, ancestor_id, descendant_id, depth) '.
                    'select ?, ancestor_id, ?, depth + 1 from team_closure where descendant_id = ?',
                    [$workspaceId, $team->id, $parentId],
                );
            }

            return $team;
        });
    }

    public function rename(Team $team, string $name): Team
    {
        $team->name = $name;
        $team->save();

        return $team;
    }

    /**
     * Move a subtree under a new parent (or to root when null), rebuilding the
     * closure. Rejects any move that would create a cycle (BR-X13).
     */
    public function reparent(Team $team, ?string $newParentId): Team
    {
        if ($newParentId !== null) {
            if ($newParentId === $team->id || in_array($newParentId, $this->descendantIds($team), true)) {
                throw new TeamHierarchyException('A team cannot be moved under itself or one of its descendants.');
            }
        }

        return DB::transaction(function () use ($team, $newParentId) {
            $workspaceId = $team->workspace_id;

            // Detach the subtree from every ancestor OUTSIDE the subtree.
            DB::delete(
                'delete from team_closure where descendant_id in '.
                '(select descendant_id from team_closure where ancestor_id = ?) '.
                'and ancestor_id not in '.
                '(select descendant_id from team_closure where ancestor_id = ?)',
                [$team->id, $team->id],
            );

            // Re-attach every subtree node under the new parent's ancestor chain.
            if ($newParentId !== null) {
                DB::insert(
                    'insert into team_closure (workspace_id, ancestor_id, descendant_id, depth) '.
                    'select ?, super.ancestor_id, sub.descendant_id, super.depth + sub.depth + 1 '.
                    'from team_closure super cross join team_closure sub '.
                    'where super.descendant_id = ? and sub.ancestor_id = ?',
                    [$workspaceId, $newParentId, $team->id],
                );
            }

            $team->parent_id = $newParentId;
            $team->save();

            return $team;
        });
    }

    /**
     * Soft-delete a leaf team, detaching its members. Child teams must be moved
     * or removed first.
     */
    public function delete(Team $team): void
    {
        if ($team->children()->exists()) {
            throw new TeamHierarchyException('Move or delete child teams before deleting this team.');
        }

        DB::transaction(function () use ($team) {
            WorkspaceMember::where('team_id', $team->id)->update(['team_id' => null]);
            DB::table('team_closure')
                ->where('ancestor_id', $team->id)
                ->orWhere('descendant_id', $team->id)
                ->delete();
            $team->delete();
        });
    }

    /**
     * Team + all descendant team ids (includes self).
     *
     * @return list<string>
     */
    public function descendantIds(Team $team): array
    {
        return DB::table('team_closure')
            ->where('ancestor_id', $team->id)
            ->pluck('descendant_id')
            ->all();
    }
}
