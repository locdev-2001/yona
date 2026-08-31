<?php

use App\Http\Controllers\App\DashboardController;
use App\Http\Controllers\App\OnboardingsController;
use App\Http\Controllers\Auth\ConfirmationsController;
use App\Http\Controllers\Auth\PasswordsController;
use App\Http\Controllers\Auth\RegistrationsController;
use App\Http\Controllers\Auth\SessionsController;
use App\Models\Account;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/app');

Route::middleware('guest')->group(function () {
    Route::get('/app/login', [SessionsController::class, 'create'])->name('login');
    Route::post('/app/login', [SessionsController::class, 'store']);

    Route::get('/app/auth/signup', [RegistrationsController::class, 'create'])->name('signup');
    Route::post('/app/auth/signup', [RegistrationsController::class, 'store']);
    Route::get('/app/auth/verify-email', function () {
        if (! session()->has('signup_email')) {
            return redirect('/app/login');
        }

        return Inertia::render('v3/views/auth/verify-email/Index', [
            'email' => session('signup_email'),
        ]);
    })->name('verify_email');
    Route::post('/app/auth/verify-email/resend', [RegistrationsController::class, 'resendConfirmation'])
        ->middleware('throttle:5,1')->name('resend_confirmation');
});

Route::get('/app/auth/confirmation', [ConfirmationsController::class, 'show'])->name('confirmation');

// Devise passwords: không chặn guest (admin đã đăng nhập vẫn gửi reset cho agent).
Route::post('/app/auth/password', [PasswordsController::class, 'store'])
    ->middleware('throttle:5,1')->name('password_reset');
Route::get('/app/auth/reset/password', fn () => Inertia::render('v3/views/auth/reset/password/Index'))
    ->name('password_reset_form');
Route::get('/app/auth/password/edit', [PasswordsController::class, 'edit'])->name('password_edit');
Route::put('/app/auth/password', [PasswordsController::class, 'update'])->name('password_update');

Route::middleware('auth')->group(function () {
    Route::post('/app/logout', [SessionsController::class, 'destroy'])->name('logout');

    Route::get('/app', [DashboardController::class, 'index'])->name('dashboard');

    Route::middleware('account.scope')->prefix('/app/accounts/{account}')->whereNumber('account')->group(function () {
        Route::get('', fn (Account $account) => redirect("/app/accounts/{$account->id}/dashboard"));
        Route::get('/dashboard', [DashboardController::class, 'show'])->name('account_dashboard');

        Route::get('/onboarding', [OnboardingsController::class, 'show'])->name('onboarding');
        Route::post('/onboarding', [OnboardingsController::class, 'update']);

        Route::get('/profile/settings', fn (Account $account) => Inertia::render('dashboard/settings/profile/Index'))
            ->name('profile_settings');

        Route::middleware('account.role:administrator')->group(function () {
            Route::get('/settings/agents', fn (Account $account) => redirect("/app/accounts/{$account->id}/settings/agents/list"));
            Route::get('/settings/agents/list', fn (Account $account) => Inertia::render('dashboard/settings/agents/Index'))
                ->name('settings_agents');
        });

        // Trang con chưa port (nhóm B→F): giữ đúng URL Chatwoot, render placeholder.
        Route::get('/{view}', [DashboardController::class, 'placeholder'])
            ->where('view', '.*')->name('account_view');
    });
});
