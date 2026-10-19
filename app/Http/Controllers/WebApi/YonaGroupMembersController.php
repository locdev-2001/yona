<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\YonaGroupResource;
use App\Models\Account;
use App\Models\YonaGroup;
use App\Services\Groups\GroupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Thành viên nhóm: thêm bạn bè, đổi vai trò, đưa ra; xoá chính mình là rời nhóm.
class YonaGroupMembersController extends Controller
{
    public function __construct(private readonly GroupService $groups) {}

    public function store(Request $request, Account $account, int $groupId): JsonResponse
    {
        $input = $request->validate(['user_ids' => ['required', 'array', 'min:1'], 'user_ids.*' => ['integer']]);
        $group = YonaGroup::query()->findOrFail($groupId);

        $this->groups->addMembers($group, $request->user(), $input['user_ids']);

        return response()->json(['members' => YonaGroupResource::members($group->refresh())]);
    }

    public function update(Request $request, Account $account, int $groupId, int $userId): JsonResponse
    {
        $input = $request->validate(['role' => ['required', 'string']]);
        $group = YonaGroup::query()->findOrFail($groupId);

        $this->groups->setRole($group, $request->user(), $userId, $input['role']);

        return response()->json(['members' => YonaGroupResource::members($group)]);
    }

    public function destroy(Request $request, Account $account, int $groupId, int $userId): Response
    {
        $group = YonaGroup::query()->findOrFail($groupId);

        $userId === $request->user()->id
            ? $this->groups->leave($group, $request->user())
            : $this->groups->remove($group, $request->user(), $userId);

        return response()->noContent();
    }
}
