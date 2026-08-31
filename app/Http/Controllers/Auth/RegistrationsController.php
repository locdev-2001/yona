<?php

namespace App\Http\Controllers\Auth;

use App\Builders\AccountBuilder;
use App\Exceptions\Account\InvalidEmail;
use App\Exceptions\Account\UserExists;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationsController extends Controller
{
    public function create(): Response|RedirectResponse
    {
        // Chatwoot: route SPA luôn serve, guard FE redirect về login khi signup tắt
        // (v3/helpers/RouteHelper.js) — API create mới trả 404.
        if (! config('yona.signup_enabled')) {
            return redirect('/app/login');
        }

        return Inertia::render('v3/views/auth/signup/Index');
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless(config('yona.signup_enabled'), 404);

        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => User::passwordRules(),
            'account_name' => ['nullable', 'string'],
            'user_full_name' => ['nullable', 'string'],
        ]);

        try {
            [$user] = (new AccountBuilder(
                accountName: $credentials['account_name'] ?? null,
                email: $credentials['email'],
                userFullName: $credentials['user_full_name'] ?? null,
                userPassword: $credentials['password'],
            ))->perform();
        } catch (InvalidEmail|UserExists $exception) {
            throw ValidationException::withMessages(['email' => $exception->getMessage()]);
        }

        $this->sendConfirmationInstructions($user);

        return redirect('/app/auth/verify-email')->with('signup_email', $user->email);
    }

    public function resendConfirmation(Request $request): RedirectResponse
    {
        $email = $request->validate(['email' => ['required', 'email']])['email'];

        $user = User::query()
            ->where('email', mb_strtolower($email))
            ->whereNull('confirmed_at')
            ->first();

        if ($user) {
            $this->sendConfirmationInstructions($user);
        }

        return back()->with('signup_email', mb_strtolower($email));
    }

    private function sendConfirmationInstructions(User $user): void
    {
        $user->forceFill([
            'confirmation_token' => $user->confirmation_token ?? Str::random(40),
            'confirmation_sent_at' => now(),
        ])->save();

        $user->notify(new ConfirmationInstructions);
    }
}
