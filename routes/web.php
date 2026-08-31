<?php

use App\Http\Controllers\App\DashboardController;
use App\Http\Controllers\App\OnboardingsController;
use App\Http\Controllers\Auth\ConfirmationsController;
use App\Http\Controllers\Auth\RegistrationsController;
use App\Http\Controllers\Auth\SessionsController;
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

Route::middleware('auth')->group(function () {
    Route::post('/app/logout', [SessionsController::class, 'destroy'])->name('logout');

    Route::get('/app', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/app/accounts/{account}', [DashboardController::class, 'show'])
        ->whereNumber('account')->name('account_dashboard');

    Route::get('/app/accounts/{account}/onboarding', [OnboardingsController::class, 'show'])
        ->whereNumber('account')->name('onboarding');
    Route::post('/app/accounts/{account}/onboarding', [OnboardingsController::class, 'update'])
        ->whereNumber('account');
});
