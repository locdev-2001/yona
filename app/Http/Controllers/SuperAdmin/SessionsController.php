<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use App\Support\SuperAdminArea;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

class SessionsController extends Controller
{
    private const MAX_ATTEMPTS = 5;

    public function create(): Response
    {
        Inertia::setRootView('superadmin_auth');

        return Inertia::render('superadmin/Login');
    }

    public function store(Request $request): RedirectResponse
    {
        Inertia::setRootView('superadmin_auth');

        $credentials = $request->validate([
            'super_admin.email' => 'required|string',
            'super_admin.password' => 'required|string',
        ], (array) __('admin_layout.validation'), [
            'super_admin.email' => __('admin_layout.labels.login_email'),
            'super_admin.password' => __('admin_layout.labels.login_password'),
        ])['super_admin'];

        $throttleKey = $this->throttleKey($credentials['email'], $request);

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            return redirect(SuperAdminArea::url('sign_in'))->with(
                'error',
                __('auth.throttle', ['seconds' => RateLimiter::availableIn($throttleKey)]),
            );
        }

        $superAdmin = SuperAdmin::query()->where('email', mb_strtolower($credentials['email']))->first();

        if ($superAdmin === null || ! Hash::check($credentials['password'], $superAdmin->password)) {
            RateLimiter::hit($throttleKey);

            return redirect(SuperAdminArea::url('sign_in'))->with('error', __('admin_layout.flash.invalid_credentials'));
        }

        RateLimiter::clear($throttleKey);

        $this->login($request, $superAdmin);

        return redirect(SuperAdminArea::url());
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('super_admin')->logout();
        $request->session()->forget('login.super_admin');

        return redirect('/');
    }

    private function login(Request $request, SuperAdmin $superAdmin): void
    {
        Auth::guard('super_admin')->login($superAdmin);
        $request->session()->regenerate();
    }

    private function throttleKey(string $email, Request $request): string
    {
        return 'super-admin-login|'.mb_strtolower($email).'|'.$request->ip();
    }
}
