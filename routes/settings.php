<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\WorkspaceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    // Language preference (design-system §10) — user menu + auth pages.
    Route::put('locale', LocaleController::class)->name('locale');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});

// Workspace-scoped settings require an active workspace context (IdentifyWorkspace).
Route::middleware(['auth', 'workspace'])->group(function () {
    Route::get('settings/workspace', [WorkspaceController::class, 'edit'])->name('workspace.edit');
    Route::patch('settings/workspace', [WorkspaceController::class, 'update'])->name('workspace.update');
});
