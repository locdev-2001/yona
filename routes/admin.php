<?php

use App\Http\Controllers\Announcements\Admin\AnnouncementController;
use App\Http\Controllers\Announcements\Admin\AnnouncementPublishController;
use App\Http\Controllers\Identity\Admin\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Identity\Admin\Auth\NewPasswordController;
use App\Http\Controllers\Identity\Admin\Auth\PasswordResetLinkController;
use App\Http\Controllers\Identity\Admin\DashboardController;
use App\Http\Controllers\Identity\Admin\ImpersonationController;
use App\Http\Controllers\Identity\Admin\WorkspaceController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Billing\Admin\WorkspacePlanController;

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

        Route::middleware('admin.can:platform.billing.manage')->group(function () {
            Route::get('workspaces/{workspace}/plans', [WorkspacePlanController::class, 'index'])->name('workspaces.plans.index');
            Route::post('workspaces/{workspace}/plans', [WorkspacePlanController::class, 'store'])->name('workspaces.plans.store');
            Route::delete('workspaces/{workspace}/plans', [WorkspacePlanController::class, 'destroy'])->name('workspaces.plans.destroy');
        });

        Route::post('workspaces/{workspace}/members/{user}/impersonate', [ImpersonationController::class, 'store'])
            ->middleware('admin.can:platform.impersonate')
            ->name('workspaces.impersonate');

        // Stop impersonation (the admin guard is still authenticated here).
        Route::post('impersonate/stop', [ImpersonationController::class, 'destroy'])
            ->name('impersonate.stop');

        // Announcements — admin CRUD + publish/unpublish.
        Route::middleware('admin.can:platform.announcements.manage')->group(function () {
            Route::resource('announcements', AnnouncementController::class)
                ->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);

            Route::post('announcements/{announcement}/publish', [AnnouncementPublishController::class, 'store'])
                ->name('announcements.publish');

            Route::delete('announcements/{announcement}/publish', [AnnouncementPublishController::class, 'destroy'])
                ->name('announcements.unpublish');
        });

    });
});
