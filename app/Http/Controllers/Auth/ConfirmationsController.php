<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Response;

class ConfirmationsController extends Controller
{
    public function show(Request $request): RedirectResponse|Response
    {
        $token = (string) $request->query('confirmation_token');

        $user = $token === ''
            ? null
            : User::query()->where('confirmation_token', $token)->first();

        if (! $user) {
            return redirect('/app/login');
        }

        if (! $user->isConfirmed()) {
            $user->forceFill([
                'confirmed_at' => now(),
                'confirmation_token' => null,
            ])->save();
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect('/app');
    }
}
