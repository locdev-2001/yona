<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Team;
use Inertia\Inertia;
use Inertia\Response;

// Mặt tiền web cho settings/teams — tương đương teams.routes.js (mọi bước đều
// meta.permissions ['administrator'], đã chặn bằng middleware account.role).
class TeamsSettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('dashboard/settings/teams/Index');
    }

    public function create(): Response
    {
        return Inertia::render('dashboard/settings/teams/CreateTeam');
    }

    public function addAgents(Account $account, int $teamId): Response
    {
        return Inertia::render('dashboard/settings/teams/AddAgents', [
            'team' => $this->fetchTeam($account, $teamId),
        ]);
    }

    public function finish(): Response
    {
        return Inertia::render('dashboard/settings/teams/FinishSetup', ['flow' => 'create']);
    }

    public function edit(Account $account, int $teamId): Response
    {
        return Inertia::render('dashboard/settings/teams/EditTeam', [
            'team' => $this->fetchTeam($account, $teamId),
        ]);
    }

    public function editAgents(Account $account, int $teamId): Response
    {
        return Inertia::render('dashboard/settings/teams/EditAgents', [
            'team' => $this->fetchTeam($account, $teamId),
        ]);
    }

    public function editFinish(Account $account, int $teamId): Response
    {
        return Inertia::render('dashboard/settings/teams/FinishSetup', [
            'flow' => 'edit',
            'team' => $this->fetchTeam($account, $teamId),
        ]);
    }

    private function fetchTeam(Account $account, int $teamId): Team
    {
        return $account->teams()->whereKey($teamId)->firstOrFail();
    }
}
