<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\Account\InviteLinkUnusable;
use App\Exceptions\Account\UserExists;
use App\Http\Controllers\Controller;
use App\Models\AccountInviteLink;
use App\Models\User;
use App\Services\AccountInviteAcceptanceService;
use App\Services\UserSignInService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

// Trang công khai /invite/{token}: không sau middleware guest/auth vì phải
// phục vụ cả khách lẫn người đã đăng nhập (một chạm tham gia).
class InviteAcceptancesController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $link = AccountInviteLink::findByToken($token);

        return Inertia::render('v3/views/auth/invite/Index', [
            'status' => $link?->status() ?? 'not_found',
            'token' => $token,
            'account' => $link !== null && $link->isUsable() ? [
                'name' => $link->account->name,
                'role' => $link->roleName(),
            ] : null,
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        try {
            $link = AccountInviteLink::findByToken($token);

            if ($link === null) {
                throw new InviteLinkUnusable('not_found');
            }

            if ($request->user() instanceof User) {
                $accountUser = app(AccountInviteAcceptanceService::class)
                    ->acceptForExistingUser($link, $request->user());
            } else {
                $data = $request->validate([
                    'name' => ['nullable', 'string', 'max:255'],
                    'email' => ['required', 'string', 'email'],
                    'password' => User::passwordRules(),
                ]);

                $accountUser = app(AccountInviteAcceptanceService::class)->acceptForNewUser(
                    $link,
                    $data['email'],
                    $data['password'],
                    $data['name'] ?? null,
                );

                app(UserSignInService::class)->signIn($request, $accountUser->user);
            }
        } catch (InviteLinkUnusable $exception) {
            return back()->with('alert', $exception->getMessage());
        } catch (UserExists $exception) {
            throw ValidationException::withMessages(['email' => $exception->getMessage()]);
        }

        return redirect("/app/accounts/{$accountUser->account_id}/dashboard");
    }
}
