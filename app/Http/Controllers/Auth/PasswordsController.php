<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ResetPasswordInstructions;
use App\Services\UserSignInService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Port từ DeviseOverrides::PasswordsController của Chatwoot.
// #update xác nhận luôn tài khoản chưa confirm (đường "Accept invitation"
// trong mail mời agent đi qua đây). Bỏ: nhánh SAML (EE).
class PasswordsController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'string']]);

        $user = User::fromEmail($data['email']);
        $user?->notify(new ResetPasswordInstructions($user->generateResetPasswordToken()));

        // Luôn 200 như Chatwoot — không lộ email nào tồn tại.
        return response()->json([
            'message' => __('Request for password reset is successful. A email with instructions will be sent to your email if it exists.'),
        ]);
    }

    public function edit(Request $request): RedirectResponse|Response
    {
        $token = (string) $request->query('reset_password_token');

        if ($token === '') {
            return redirect('/app/login');
        }

        return Inertia::render('v3/views/auth/password/Edit', [
            'resetPasswordToken' => $token,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reset_password_token' => ['required', 'string'],
            'password' => ['confirmed', ...User::passwordRules()],
        ]);

        $user = User::query()->where('reset_password_token', $data['reset_password_token'])->first();

        if (! $user) {
            return response()->json(['message' => __('Invalid token'), 'redirect_url' => '/'], 422);
        }

        if (! $user->isConfirmed()) {
            $user->confirmed_at = now();
        }

        $user->password = $data['password'];
        $user->forceFill([
            'reset_password_token' => null,
            'reset_password_sent_at' => null,
            'confirmation_token' => null,
        ])->save();

        app(UserSignInService::class)->signIn($request, $user);

        return response()->json(['message' => 'success', 'redirect_url' => '/app']);
    }
}
