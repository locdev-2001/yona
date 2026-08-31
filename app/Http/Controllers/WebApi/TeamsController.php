<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Port từ Api::V1::Accounts::TeamsController của Chatwoot.
// Quyền: chỉ administrator được create/update/destroy (TeamPolicy), index/show
// mở cho mọi thành viên account.
class TeamsController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        return response()->json(
            $account->teams()->get()->map(fn (Team $team) => $this->teamPayload($request, $team))->values()
        );
    }

    public function show(Request $request, Account $account, int $teamId): JsonResponse
    {
        return response()->json($this->teamPayload($request, $this->fetchTeam($account, $teamId)));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $team = $account->teams()->create($this->validatedTeam($request, $account));

        return response()->json($this->teamPayload($request, $team));
    }

    public function update(Request $request, Account $account, int $teamId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $team = $this->fetchTeam($account, $teamId);
        $team->update($this->validatedTeam($request, $account, $team));

        return response()->json($this->teamPayload($request, $team));
    }

    public function destroy(Request $request, Account $account, int $teamId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $this->fetchTeam($account, $teamId)->delete();

        return response()->json(['message' => 'ok']);
    }

    private function validatedTeam(Request $request, Account $account, ?Team $team = null): array
    {
        if ($request->has('name')) {
            $request->merge(['name' => Team::normalizeName((string) $request->input('name'))]);
        }

        return $request->validate([
            // presence + uniqueness: { scope: :account_id } — kiểm trên tên ĐÃ chuẩn hóa,
            // nên tên chỉ gồm khoảng trắng/ký tự điều khiển bị loại ở đây.
            'name' => [
                $team === null ? 'required' : 'sometimes',
                'string',
                'max:255',
                Rule::unique('teams', 'name')
                    ->where('account_id', $account->id)
                    ->ignore($team?->id),
            ],
            'description' => ['sometimes', 'nullable', 'string'],
            'allow_auto_assign' => ['sometimes', 'boolean'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:255'],
            'icon_color' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
    }

    private function fetchTeam(Account $account, int $teamId): Team
    {
        return $account->teams()->whereKey($teamId)->firstOrFail();
    }

    // Tương đương api/v1/models/_team.json.jbuilder.
    private function teamPayload(Request $request, Team $team): array
    {
        return [
            'id' => $team->id,
            'name' => $team->name,
            'description' => $team->description,
            'allow_auto_assign' => $team->allow_auto_assign,
            'icon' => $team->icon,
            'icon_color' => $team->icon_color,
            'account_id' => $team->account_id,
            'is_member' => $team->members()->whereKey($request->user()->id)->exists(),
        ];
    }
}
