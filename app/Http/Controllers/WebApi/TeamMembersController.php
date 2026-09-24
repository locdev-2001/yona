<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentResource;
use App\Models\Account;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Payload trả về là agent (partial _agent dùng chung → AgentResource).
class TeamMembersController extends Controller
{
    public function index(Request $request, Account $account, int $teamId): JsonResponse
    {
        $team = $this->fetchTeam($account, $teamId);

        return response()->json(AgentResource::forAccount($this->membersOf($team), $account));
    }

    public function store(Request $request, Account $account, int $teamId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $team = $this->fetchTeam($account, $teamId);
        $userIds = $this->validatedUserIds($request, $account);

        $added = DB::transaction(fn () => $team->addMembers(array_values(array_diff($userIds, $this->memberIds($team)))));

        return response()->json(AgentResource::forAccount($added, $account));
    }

    public function update(Request $request, Account $account, int $teamId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $team = $this->fetchTeam($account, $teamId);
        $userIds = $this->validatedUserIds($request, $account);

        DB::transaction(function () use ($team, $userIds) {
            $currentIds = $this->memberIds($team);
            $team->addMembers(array_values(array_diff($userIds, $currentIds)));
            $team->removeMembers(array_values(array_diff($currentIds, $userIds)));
        });

        return response()->json(AgentResource::forAccount($this->membersOf($team), $account));
    }

    public function destroy(Request $request, Account $account, int $teamId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $team = $this->fetchTeam($account, $teamId);
        $userIds = $this->validatedUserIds($request, $account);

        DB::transaction(fn () => $team->removeMembers($userIds));

        return response()->json(['message' => 'ok']);
    }

    /** @return list<int> */
    private function validatedUserIds(Request $request, Account $account): array
    {
        $userIds = array_map('intval', $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer'],
        ])['user_ids']);

        // validate_member_id_params: id ngoài account → 401 'Invalid User IDs'.
        $accountUserIds = $account->users()->pluck('users.id')->all();
        abort_if(array_diff($userIds, $accountUserIds) !== [], 401, 'Invalid User IDs');

        return $userIds;
    }

    /** @return list<int> */
    private function memberIds(Team $team): array
    {
        return $team->members()->pluck('users.id')->all();
    }

    private function membersOf(Team $team): iterable
    {
        return $team->members()->with('accountUsers')->get();
    }

    private function fetchTeam(Account $account, int $teamId): Team
    {
        return $account->teams()->whereKey($teamId)->firstOrFail();
    }
}
