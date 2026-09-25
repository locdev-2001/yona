<?php

namespace App\Http\Controllers\WebApi;

use App\Builders\AccountInviteLinkBuilder;
use App\Http\Controllers\Controller;
use App\Http\Resources\AccountInviteLinkResource;
use App\Models\Account;
use App\Models\AccountInviteLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

// Quản lý link mời trong Cài đặt > Nhân viên — chỉ quản trị viên (giống
// AgentsController). Nhận lời mời qua link nằm ở mặt tiền web.php
// (Auth\InviteAcceptancesController) vì đó là trang công khai, không cần session.
class InviteLinksController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $links = $account->inviteLinks()->with('creator')->latest()->get();

        return response()->json(AccountInviteLinkResource::collection($links));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $data = $request->validate([
            'role' => ['required', 'in:agent,administrator'],
            'expires_in_days' => ['required', 'integer', 'in:'.implode(',', AccountInviteLink::EXPIRY_DAY_CHOICES)],
            'max_uses' => ['nullable', 'integer', 'min:1'],
        ]);

        $result = (new AccountInviteLinkBuilder(
            account: $account,
            creator: $request->user(),
            role: $data['role'],
            expiresInDays: $data['expires_in_days'],
            maxUses: $data['max_uses'] ?? null,
        ))->perform();

        return response()->json([
            'link' => (new AccountInviteLinkResource($result['link']))->toArray($request),
            // Token thật + URL đầy đủ chỉ xuất hiện trong response này — sau đó
            // không truy vấn lại được nữa (chỉ còn digest trong DB).
            'token' => $result['token'],
            'url' => URL::to("/invite/{$result['token']}"),
        ], 201);
    }

    public function destroy(Request $request, Account $account, int $linkId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $link = $account->inviteLinks()->whereKey($linkId)->firstOrFail();
        $link->update(['revoked_at' => now()]);

        return response()->json(['message' => 'ok']);
    }
}
