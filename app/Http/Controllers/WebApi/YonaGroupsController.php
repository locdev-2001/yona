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

    // Đổi tên và/hoặc avatar nhóm (quản trị).
    public function update(Request $request, Account $account, int $groupId): JsonResponse
    {
        $input = $request->validate([
            'name' => ['required_without:avatar_seed', 'string'],
            'avatar_seed' => ['required_without:name', 'string'],
        ]);
        $group = YonaGroup::query()->findOrFail($groupId);

        if (isset($input['name'])) {
            $group = $this->groups->rename($group, $request->user(), $input['name']);
        }

        if (isset($input['avatar_seed'])) {
            $group = $this->groups->changeAvatar($group, $request->user(), $input['avatar_seed']);
        }

        return response()->json(YonaGroupResource::forMember($group, $this->permissions->activeMember($group, $request->user())));
    }
}
