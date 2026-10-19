<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\User;
use App\Services\Chat\ChatMemberships;
use App\Services\Chat\ChatPresenter;
use App\Services\Chat\GroupChats;
use App\Services\Chat\GroupInviteLinks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class GroupChatsController extends Controller
{
    private const AVATAR_RULES = ['sometimes', 'nullable', 'file', 'mimes:jpg,jpeg,png,gif,webp', 'max:15360'];

    public function __construct(
        private readonly GroupChats $groups,
        private readonly ChatMemberships $memberships,
        private readonly ChatPresenter $presenter,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'user_ids' => ['required', 'array', 'max:499'],
            'user_ids.*' => ['integer'],
            'avatar' => self::AVATAR_RULES,
        ]);

        $chat = $this->groups->create($request->user(), trim($data['title']), array_map('intval', $data['user_ids']), $request->file('avatar'));

        return response()->json($this->presenter->chat($chat, $request->user(), $this->memberships), 201);
    }

    public function update(Request $request, Chat $chat): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'avatar' => self::AVATAR_RULES,
            'remove_avatar' => ['sometimes', 'boolean'],
        ]);

        $chat = $this->groups->updateInfo(
            $request->user(),
            $chat,
            isset($data['title']) ? trim($data['title']) : null,
            array_key_exists('description', $data) ? (string) $data['description'] : null,
            $request->file('avatar'),
            (bool) ($data['remove_avatar'] ?? false),
        );

        return response()->json($this->presenter->chat($chat, $request->user(), $this->memberships));
    }

    public function members(Request $request, Chat $chat): JsonResponse
    {
        $members = $this->groups->members($request->user(), $chat);

        return response()->json(['payload' => $members->map(fn (ChatMember $member) => $this->presenter->member($member))->values()]);
    }

    public function addMembers(Request $request, Chat $chat): JsonResponse
    {
        $data = $request->validate(['user_ids' => ['required', 'array', 'max:499'], 'user_ids.*' => ['integer']]);
        $requested = array_map('intval', $data['user_ids']);
        $added = $this->groups->addMembers($request->user(), $chat, $requested);

        return response()->json([
            'added' => $added->map(fn (User $user) => $this->presenter->person($user))->values(),
            'skipped_count' => count(array_unique($requested)) - $added->count(),
        ]);
    }

    public function removeMember(Request $request, Chat $chat, User $user): Response
    {
        $this->groups->removeMember($request->user(), $chat, $user);

        return response()->noContent();
    }

    public function changeRole(Request $request, Chat $chat, User $user): Response
    {
        $role = $request->validate(['role' => ['required', Rule::in(ChatMember::ROLE_NAMES)]])['role'];
        $this->groups->changeRole($request->user(), $chat, $user, (int) array_search($role, ChatMember::ROLE_NAMES, true));

        return response()->noContent();
    }

    public function dissolve(Request $request, Chat $chat): Response
    {
        $this->groups->dissolve($request->user(), $chat);

        return response()->noContent();
    }

    public function inviteLink(Request $request, Chat $chat, GroupInviteLinks $links): JsonResponse
    {
        $this->groups->groupMember($request->user(), $chat);
        $link = $links->current($chat);

        return response()->json(['url' => $link ? $links->url($link) : null]);
    }

    public function rotateInviteLink(Request $request, Chat $chat, GroupInviteLinks $links): JsonResponse
    {
        return response()->json(['url' => $links->url($links->rotate($request->user(), $chat))]);
    }

    public function revokeInviteLink(Request $request, Chat $chat, GroupInviteLinks $links): Response
    {
        $links->revoke($request->user(), $chat);

        return response()->noContent();
    }
}
