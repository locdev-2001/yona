<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CallJoinResource;
use App\Models\Account;
use App\Models\Call;
use App\Models\YonaGroup;
use App\Services\Calls\CallMedia;
use App\Services\Calls\InvitationStatus;
use App\Services\Groups\Calls\GroupCalls;
use App\Services\Groups\Calls\GroupCallSignals;
use App\Services\Groups\Calls\GroupCallSummaries;
use App\Services\Groups\GroupPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Cuộc gọi nhóm có đổ chuông: gọi (hoặc vào cuộc đang diễn ra) và nhận vé, từ chối, các cuộc đang
// đổ chuông tới mình, quản trị tắt mic / mời người ra.
class YonaGroupCallingController extends Controller
{
    public function __construct(
        private readonly GroupCalls $groupCalls,
        private readonly GroupCallSummaries $summaries,
        private readonly GroupCallSignals $signals,
        private readonly GroupPermissions $permissions,
    ) {}

    public function store(Request $request, Account $account, int $groupId): JsonResponse
    {
        $input = $request->validate(['media' => ['sometimes', Rule::enum(CallMedia::class)]]);
        $group = YonaGroup::query()->findOrFail($groupId);
        $join = $this->groupCalls->join($group, $request->user(), CallMedia::tryFrom($input['media'] ?? '') ?? CallMedia::Audio);

        return response()->json(CallJoinResource::from($join));
    }

    public function decline(Request $request, Account $account, int $groupId): JsonResponse
    {
        $group = YonaGroup::query()->findOrFail($groupId);
        $this->permissions->activeMember($group, $request->user());
        $this->groupCalls->decline($group, $request->user());

        return response()->json(['ok' => true]);
    }

    public function ringing(Request $request, Account $account): JsonResponse
    {
        $user = $request->user();
        $views = $this->groupCalls->ringingFor($user)
            ->map(function (Call $call) use ($user): ?array {
                $member = $call->group->activeMemberFor($user)?->loadMissing('conversation:id,account_id,display_id');

                return $member === null ? null : $this->signals->viewFor($call->group, $member, $this->summaries->snapshot($call->group), InvitationStatus::Ringing);
            })
            ->filter()
            ->values();

        return response()->json(['group_calls' => $views]);
    }

    public function mute(Request $request, Account $account, int $groupId, int $userId): JsonResponse
    {
        $this->groupCalls->mute(YonaGroup::query()->findOrFail($groupId), $request->user(), $userId);

        return response()->json(['ok' => true]);
    }

    public function remove(Request $request, Account $account, int $groupId, int $userId): JsonResponse
    {
        $this->groupCalls->remove(YonaGroup::query()->findOrFail($groupId), $request->user(), $userId);

        return response()->json(['ok' => true]);
    }
}
