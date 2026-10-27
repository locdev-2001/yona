<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\YonaGroupResource;
use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\YonaGroup;
use App\Models\YonaGroupInviteLink;
use App\Services\Groups\GroupPermissions;
use App\Services\Groups\GroupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

// Link mời vào nhóm: quản trị tạo/thu hồi; ai có link thì xem trước và tham gia.
class YonaGroupInvitesController extends Controller
{
    public function __construct(private readonly GroupService $groups, private readonly GroupPermissions $permissions) {}

    public function index(Request $request, Account $account, int $groupId): JsonResponse
    {
        $group = YonaGroup::query()->findOrFail($groupId);
        $this->permissions->admin($group, $request->user());

        return response()->json([
            'payload' => $group->inviteLinks()->latest('id')->get()
                ->map(fn (YonaGroupInviteLink $link) => YonaGroupResource::inviteLink($link))
                ->values(),
        ]);
    }

    public function store(Request $request, Account $account, int $groupId): JsonResponse
    {
        $input = $request->validate([
            'expires_in_days' => ['nullable', 'integer', Rule::in(AccountInviteLink::EXPIRY_DAY_CHOICES)],
            'max_uses' => ['nullable', 'integer', 'min:1'],
        ]);

        [$link, $token] = $this->groups->issueInviteLink(
            YonaGroup::query()->findOrFail($groupId),
            $request->user(),
            $input['expires_in_days'] ?? null,
            $input['max_uses'] ?? null,
        );

        return response()->json([...YonaGroupResource::inviteLink($link), 'token' => $token], 201);
    }

    public function destroy(Request $request, Account $account, int $groupId, int $linkId): Response
    {
        $this->groups->revokeInviteLink(YonaGroup::query()->findOrFail($groupId), $request->user(), $linkId);

        return response()->noContent();
    }

    public function preview(Request $request, string $token): JsonResponse
    {
        $group = $this->groups->groupForInvite($token);

        return response()->json([
            'name' => $group->name,
            'member_count' => $group->member_count,
            'is_member' => $group->activeMemberFor($request->user()) !== null,
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $member = $this->groups->acceptInvite($token, $request->user());

        return response()->json([
            'account_id' => $member->conversation->account_id,
            ...YonaGroupResource::forMember($member->group, $member),
        ]);
    }
}
