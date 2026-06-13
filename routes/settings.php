<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Settings\MemberController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TeamController;
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

    Route::get('settings/teams', [TeamController::class, 'index'])->name('teams.index');
    Route::post('settings/teams', [TeamController::class, 'store'])->name('teams.store');
    Route::patch('settings/teams/{team}', [TeamController::class, 'update'])->name('teams.update');
    Route::patch('settings/teams/{team}/reparent', [TeamController::class, 'reparent'])->name('teams.reparent');
    Route::delete('settings/teams/{team}', [TeamController::class, 'destroy'])->name('teams.destroy');

    Route::get('settings/members', [MemberController::class, 'index'])->name('members.index');
    Route::post('settings/members', [MemberController::class, 'store'])->name('members.store');
    Route::patch('settings/members/{member}', [MemberController::class, 'update'])->name('members.update');
    Route::delete('settings/members/{member}', [MemberController::class, 'destroy'])->name('members.destroy');
});
