<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccountInviteLinkResource;
use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class InviteLinksController extends Controller
{
    private const MAX_USES_LIMIT = 1000;

    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $links = $account->inviteLinks()->with('creator')->latest()->limit(50)->get();

        return response()->json(AccountInviteLinkResource::collection($links));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $data = $request->validate([
            'role' => ['required', 'in:agent,administrator'],
            'expires_in_days' => ['required', 'integer', 'in:'.implode(',', AccountInviteLink::EXPIRY_DAY_CHOICES)],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_USES_LIMIT],
        ]);

        [$link, $token] = AccountInviteLink::issue(
            account: $account,
            creator: $request->user(),
            role: AccountUser::roleFromName($data['role']),
            expiresInDays: $data['expires_in_days'],
            maxUses: $data['max_uses'] ?? null,
        );

        return response()->json([
            'link' => (new AccountInviteLinkResource($link))->toArray($request),
            'url' => URL::to("/invite/{$token}"),
        ], 201);
    }

    public function destroy(Request $request, Account $account, int $linkId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $link = $account->inviteLinks()->whereKey($linkId)->whereNull('revoked_at')->firstOrFail();
        $link->update(['revoked_at' => now()]);

        return response()->json(['message' => 'ok']);
    }
}
