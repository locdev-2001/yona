<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// Port từ nhánh `process_sso_auth_token` trong
// refs/chatwoot/app/controllers/devise_overrides/sessions_controller.rb — link
// đăng nhập một lần do Platform API (users#login) và nút "Impersonate user" của
// console quản trị sinh ra.
class SsoSessionsController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $token = (string) $request->query('sso_auth_token');
        $user = User::fromEmail($request->query('email'));

        if ($user === null || $token === '' || ! $user->validSsoAuthToken($token)) {
            return redirect('/app/login')->with('alert', 'Invalid or expired sign-in link.');
        }

        $user->invalidateSsoAuthToken($token);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return redirect('/app');
    }
}
