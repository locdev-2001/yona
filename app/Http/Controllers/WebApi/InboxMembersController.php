<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Port từ Api::V1::Accounts::InboxMembersController của Chatwoot.
// create chỉ THÊM id còn thiếu, update diff add/remove, destroy bỏ qua id lạ —
// đúng phép toán bản gốc. inbox_id sai → 404 (find của Rails), user_id không
// tồn tại → 422 'User must exist' (belongs_to :user). Khác chủ đích: user của
// account khác cũng bị chặn 422 (bản gốc không kiểm — lỗ scoping, không bê theo).
class InboxMembersController extends Controller
{
    public function show(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $inbox = $account->inboxes()->findOrFail($inboxId);

        // authorize :show? — agent ngoài inbox bị 401 như Pundit::NotAuthorizedError.
        $accountUser = $this->currentAccountUser($request);
        abort_unless(
            $accountUser->isAdministrator()
                || $inbox->inboxMembers()->where('user_id', $request->user()->id)->exists(),
            401,
            'You are not authorized to do this action'
        );

        return $this->updatedAgents($account, $inbox);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        [$inbox, $userIds] = $this->fetchInboxAndUserIds($request, $account);

        DB::transaction(fn () => $inbox->addMembers(
            array_values(array_diff($userIds, $this->currentAgentIds($inbox)))
        ));

        return $this->updatedAgents($account, $inbox);
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        [$inbox, $userIds] = $this->fetchInboxAndUserIds($request, $account);
        $currentIds = $this->currentAgentIds($inbox);

        DB::transaction(function () use ($inbox, $userIds, $currentIds) {
            $inbox->addMembers(array_values(array_diff($userIds, $currentIds)));
            $inbox->removeMembers(array_values(array_diff($currentIds, $userIds)));
        });

        return $this->updatedAgents($account, $inbox);
    }

    public function destroy(Request $request, Account $account): JsonResponse
    {
        [$inbox, $userIds] = $this->fetchInboxAndUserIds($request, $account, validateUsers: false);

        DB::transaction(fn () => $inbox->removeMembers($userIds));

        return response()->json(null, 200);
    }

    /** @return array{0: Inbox, 1: list<int>} */
    private function fetchInboxAndUserIds(Request $request, Account $account, bool $validateUsers = true): array
    {
        $this->authorizeAdministrator($request);

        $inbox = $account->inboxes()->findOrFail((int) $request->input('inbox_id'));

        $userIds = array_map('intval', (array) $request->input('user_ids', []));

        if ($validateUsers) {
            $validUserIds = $account->accountUsers()->whereIn('user_id', $userIds)->pluck('user_id')->all();
            if (array_diff($userIds, $validUserIds) !== []) {
                abort(422, 'User must exist');
            }
        }

        return [$inbox, $userIds];
    }

    /** @return list<int> */
    private function currentAgentIds(Inbox $inbox): array
    {
        return $inbox->inboxMembers()->pluck('user_id')->all();
    }

    private function updatedAgents(Account $account, Inbox $inbox): JsonResponse
    {
        $agents = $account->users()
            ->whereIn('users.id', $inbox->inboxMembers()->pluck('user_id'))
            ->with('accountUsers')
            ->get();

        return response()->json([
            'payload' => AgentResource::forAccount($agents, $account),
        ]);
    }

    private function currentAccountUser(Request $request): AccountUser
    {
        return $request->attributes->get('currentAccountUser');
    }
}
