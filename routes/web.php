<?php

use App\Http\Controllers\AnnouncementReadController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\WelcomeController;
use App\Http\Controllers\WhatsNewController;
use App\Http\Controllers\WorkspaceSwitchController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');

Route::middleware(['auth'])->group(function () {
    // Switch active workspace (validated against the user's memberships).
    Route::post('workspaces/{workspace}/switch', WorkspaceSwitchController::class)->name('workspaces.switch');

    // Workspace-scoped app screens require an active membership (IdentifyWorkspace).
    Route::middleware('workspace')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        // Announcements / What's New — tenant feed + mark-read.
        Route::get('whats-new', WhatsNewController::class)->name('announcements.index');
        Route::post('whats-new/{announcement}/read', AnnouncementReadController::class)->name('announcements.read');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
