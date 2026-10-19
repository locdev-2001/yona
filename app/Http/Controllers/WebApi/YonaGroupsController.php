<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\YonaGroupResource;
use App\Models\Account;
use App\Models\YonaGroup;
use App\Services\Groups\GroupPermissions;
use App\Services\Groups\GroupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Nhóm giữa người dùng Yona: tạo, xem (kèm thành viên), đổi tên.
class YonaGroupsController extends Controller
{
    public function __construct(private readonly GroupService $groups, private readonly GroupPermissions $permissions) {}

    public function store(Request $request, Account $account): JsonResponse
    {
        $input = $request->validate([
            'name' => ['required', 'string'],
            'user_ids' => ['array'],
            'user_ids.*' => ['integer'],
        ]);

        $group = $this->groups->create($request->user(), $input['name'], $input['user_ids'] ?? []);

        return response()->json(YonaGroupResource::forMember($group, $group->activeMemberFor($request->user()), withMembers: true), 201);
    }

    public function show(Request $request, Account $account, int $groupId): JsonResponse
    {
        $group = YonaGroup::query()->findOrFail($groupId);

        return response()->json(YonaGroupResource::forMember($group, $this->permissions->activeMember($group, $request->user()), withMembers: true));
    }

    public function update(Request $request, Account $account, int $groupId): JsonResponse
    {
        $input = $request->validate(['name' => ['required', 'string']]);
        $group = $this->groups->rename(YonaGroup::query()->findOrFail($groupId), $request->user(), $input['name']);

        return response()->json(YonaGroupResource::forMember($group, $this->permissions->activeMember($group, $request->user())));
    }
}
