<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

// — đăng nhập riêng cho console quản trị, guard `super_admin`.
class SessionsController extends Controller
{
    public function create(): Response
    {
        Inertia::setRootView('superadmin_auth');

        return Inertia::render('superadmin/Login');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'super_admin.email' => 'required|string',
            'super_admin.password' => 'required|string',
        ])['super_admin'];

        $superAdmin = SuperAdmin::query()->where('email', mb_strtolower($credentials['email']))->first();

        if ($superAdmin === null || ! Hash::check($credentials['password'], $superAdmin->password)) {
            return redirect('/super_admin/sign_in')->with('error', 'Invalid credentials. Please try again.');
        }

        Auth::guard('super_admin')->login($superAdmin);
        $request->session()->regenerate();

        return redirect('/super_admin');
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('super_admin')->logout();
        $request->session()->forget('login.super_admin');

        return redirect('/');
    }
}
