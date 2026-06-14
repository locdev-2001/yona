<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\WelcomeController;
use App\Http\Controllers\WorkspaceSwitchController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');

Route::middleware(['auth'])->group(function () {
    // Switch active workspace (validated against the user's memberships).
    Route::post('workspaces/{workspace}/switch', WorkspaceSwitchController::class)->name('workspaces.switch');

    // Workspace-scoped app screens require an active membership (IdentifyWorkspace).
    Route::middleware('workspace')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
