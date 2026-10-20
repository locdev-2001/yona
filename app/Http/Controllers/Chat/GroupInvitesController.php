<?php

namespace App\Http\Controllers\Chat;

use App\Exceptions\GroupActionRejected;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\YonaGroupInviteLink;
use App\Services\Groups\GroupService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

// Trang mở link mời vào nhóm (/g/{token}): ai cũng xem được; người chưa đăng nhập được
// đưa đi đăng nhập/đăng ký rồi quay lại đúng trang này để tham gia.
class GroupInvitesController extends Controller
{
    public function __construct(private readonly GroupService $groups) {}

    public function show(Request $request, string $token): Response
    {
        $link = YonaGroupInviteLink::findByToken($token);
        $group = $link !== null && $link->isUsable() ? $link->group : null;
        $user = $request->user();
        $membership = $group !== null && $user instanceof User ? $group->activeMemberFor($user) : null;

        if (! $user instanceof User) {
            session()->put('url.intended', $request->fullUrl());
        }

        return Inertia::render('v3/views/groups/invite/Index', [
            'status' => $link?->status() ?? 'not_found',
            'token' => $token,
            'group' => $group === null ? null : [
                'name' => $group->name,
                'member_count' => $group->member_count,
                'inviter' => $link->creator?->availableName(),
            ],
            'openUrl' => $membership === null ? null : "/app/accounts/{$membership->conversation->account_id}/conversations/{$membership->conversation->display_id}",
        ]);
    }

    public function store(Request $request, string $token): HttpResponse
    {
        $user = $request->user();

        if ($user->username === null) {
            session()->put('url.intended', url("/g/{$token}"));

            return Inertia::location(route('chat.welcome'));
        }

        try {
            $member = $this->groups->acceptInvite($token, $user);
        } catch (GroupActionRejected $rejected) {
            return back()->with('alert', $rejected->getMessage());
        }

        // Trang mời và hộp thư dùng hai bộ CSS khác nhau nên phải tải lại trọn trang.
        return Inertia::location("/app/accounts/{$member->conversation->account_id}/conversations/{$member->conversation->display_id}");
    }
}
