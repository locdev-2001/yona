<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\Account\InvalidEmail;
use App\Exceptions\Account\UserExists;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OAuth\OAuthProviders;
use App\Services\Users\PersonalSignUpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationsController extends Controller
{
    public function create(OAuthProviders $oauthProviders): Response
    {
        return Inertia::render('v3/views/auth/signup/Index', [
            'oauthProviders' => $oauthProviders->configuredNames(),
        ]);
    }

    public function store(Request $request, PersonalSignUpService $signUp): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => User::passwordRules(),
            'user_full_name' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $user = $signUp->signUp(
                email: $credentials['email'],
                password: $credentials['password'],
                name: $credentials['user_full_name'] ?? null,
                emailVerified: false,
            );
        } catch (InvalidEmail|UserExists $exception) {
            throw ValidationException::withMessages(['email' => $exception->getMessage()]);
        }

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
            $user->sendConfirmationInstructions();
        }

        return back()->with('signup_email', mb_strtolower($email));
    }
}
