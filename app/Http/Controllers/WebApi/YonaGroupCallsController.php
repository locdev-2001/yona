<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CallJoinResource;
use App\Models\Account;
use App\Models\YonaGroup;
use App\Services\Calls\CallMedia;
use App\Services\Groups\Calls\GroupRooms;
use App\Services\Groups\Calls\GroupRoomSummaries;
use App\Services\Groups\GroupPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Phòng thoại nhóm: xem phòng đang mở, vào phòng (mở nếu chưa có) và nhận vé kết nối, quản
// trị tắt mic / mời người ra.
class YonaGroupCallsController extends Controller
{
    public function __construct(
        private readonly GroupRooms $groupRooms,
        private readonly GroupRoomSummaries $summaries,
        private readonly GroupPermissions $permissions,
    ) {}

    public function show(Request $request, Account $account, int $groupId): JsonResponse
    {
        $group = YonaGroup::query()->findOrFail($groupId);
        $this->permissions->activeMember($group, $request->user());

        return response()->json(['voice_room' => $this->summaries->of($group)]);
    }

    public function store(Request $request, Account $account, int $groupId): JsonResponse
    {
        $input = $request->validate([
            'media' => ['sometimes', Rule::enum(CallMedia::class)],
        ]);

        $join = $this->groupRooms->join(
            YonaGroup::query()->findOrFail($groupId),
            $request->user(),
            CallMedia::tryFrom($input['media'] ?? '') ?? CallMedia::Audio,
        );

        return response()->json(CallJoinResource::from($join));
    }

    public function mute(Request $request, Account $account, int $groupId, int $userId): JsonResponse
    {
        $this->groupRooms->mute(YonaGroup::query()->findOrFail($groupId), $request->user(), $userId);

        return response()->json(['ok' => true]);
    }

    public function remove(Request $request, Account $account, int $groupId, int $userId): JsonResponse
    {
        $this->groupRooms->remove(YonaGroup::query()->findOrFail($groupId), $request->user(), $userId);

        return response()->json(['ok' => true]);
    }
}
