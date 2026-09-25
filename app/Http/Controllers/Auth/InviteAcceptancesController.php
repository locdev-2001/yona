<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\Account\InvalidEmail;
use App\Exceptions\Account\InviteLinkUnusable;
use App\Exceptions\Account\UserExists;
use App\Http\Controllers\Controller;
use App\Models\AccountInviteLink;
use App\Models\User;
use App\Services\AccountInviteAcceptanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

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

                return redirect("/app/accounts/{$accountUser->account_id}/dashboard");
            }

            $data = $request->validate([
                'name' => ['nullable', 'string', 'max:255'],
                'email' => ['required', 'string', 'email'],
                'password' => User::passwordRules(),
            ]);

            app(AccountInviteAcceptanceService::class)->acceptForNewUser(
                $link,
                $data['email'],
                $data['password'],
                $data['name'] ?? null,
            );

            return redirect('/app/auth/verify-email')->with('signup_email', $data['email']);
        } catch (InviteLinkUnusable $exception) {
            return back()->with('alert', __('invite_links.PAGE.ERRORS.'.strtoupper($exception->reason).'.TITLE'));
        } catch (UserExists|InvalidEmail $exception) {
            throw ValidationException::withMessages(['email' => $exception->getMessage()]);
        }
    }
}
