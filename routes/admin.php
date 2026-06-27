<?php

use Illuminate\Support\Facades\Route;
use Modules\Identity\Http\Controllers\Admin\Auth\AuthenticatedSessionController;
use Modules\Identity\Http\Controllers\Admin\Auth\NewPasswordController;
use Modules\Identity\Http\Controllers\Admin\Auth\PasswordResetLinkController;
use Modules\Identity\Http\Controllers\Admin\DashboardController;
use Modules\Identity\Http\Controllers\Admin\ImpersonationController;
use Modules\Identity\Http\Controllers\Admin\WorkspaceController;

Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest:admin')->group(function () {
        Route::get('login', [AuthenticatedSessionController::class, 'create'])
            ->name('login');

        Route::post('login', [AuthenticatedSessionController::class, 'store']);

        Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
            ->name('password.request');

        Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
            ->name('password.email');

        Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
            ->name('password.reset');

        Route::post('reset-password', [NewPasswordController::class, 'store'])
            ->name('password.store');
    });

    Route::middleware(['auth:admin', 'admin.scope'])->group(function () {
        Route::redirect('/', '/admin/dashboard');

        Route::get('dashboard', DashboardController::class)->name('dashboard');

        Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
            ->name('logout');

        Route::middleware('admin.can:platform.workspaces.view')->group(function () {
            Route::get('workspaces', [WorkspaceController::class, 'index'])->name('workspaces.index');
            Route::get('workspaces/{workspace}', [WorkspaceController::class, 'show'])->name('workspaces.show');
        });

        Route::post('workspaces/{workspace}/members/{user}/impersonate', [ImpersonationController::class, 'store'])
            ->middleware('admin.can:platform.impersonate')
            ->name('workspaces.impersonate');

        // Stop impersonation (the admin guard is still authenticated here).
        Route::post('impersonate/stop', [ImpersonationController::class, 'destroy'])
            ->name('impersonate.stop');

    });
});
