<?php

namespace App\Http\Controllers\Identity\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\TeamReparentRequest;
use App\Http\Requests\Settings\TeamStoreRequest;
use App\Http\Requests\Settings\TeamUpdateRequest;
use App\Models\Team;
use App\Services\TeamService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Settings → Teams (admin). Tree CRUD with closure maintenance + cycle guard
 * via TeamService. Single-record routes scope to the workspace (404 on a
 * foreign id, BR-X15). All mutations are audited by the Team model.
 */
class TeamController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', Team::class);

        $counts = DB::table('workspace_member')
            ->select('team_id', DB::raw('count(*) as total'))
            ->whereNotNull('team_id')
            ->groupBy('team_id')
            ->pluck('total', 'team_id');

        $teams = Team::query()
            ->orderBy('name')
            ->get(['id', 'name', 'parent_id'])
            ->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'parent_id' => $team->parent_id,
                'member_count' => (int) ($counts[$team->id] ?? 0),
            ]);

        return Inertia::render('settings/teams', ['teams' => $teams]);
    }

    public function store(TeamStoreRequest $request, TeamService $teams): RedirectResponse
    {
        $teams->create($request->string('name')->toString(), $request->input('parent_id'));

        return back()->with('success', __('platform.teams.created'));
    }

    public function update(TeamUpdateRequest $request, Team $team, TeamService $teams): RedirectResponse
    {
        $this->authorize('update', $team);
        $teams->rename($team, $request->string('name')->toString());

        return back()->with('success', __('platform.teams.updated'));
    }

    public function reparent(TeamReparentRequest $request, Team $team, TeamService $teams): RedirectResponse
    {
        $this->authorize('reparent', $team);
        $teams->reparent($team, $request->input('parent_id'));

        return back()->with('success', __('platform.teams.updated'));
    }

    public function destroy(Team $team, TeamService $teams): RedirectResponse
    {
        $this->authorize('delete', $team);
        $teams->delete($team);

        return back()->with('success', __('platform.teams.deleted'));
    }
}
