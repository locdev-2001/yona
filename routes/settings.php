<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Settings\AppearanceController;
use App\Http\Controllers\Settings\MemberController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TeamController;
use App\Http\Controllers\Settings\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    // Language preference (design-system §10) — user menu + auth pages.
    Route::put('locale', LocaleController::class)->name('locale');

    Route::prefix('settings')->group(function () {
        Route::controller(ProfileController::class)->name('profile.')->group(function () {
            Route::get('profile', 'edit')->name('edit');
            Route::patch('profile', 'update')->name('update');
            Route::delete('profile', 'destroy')->name('destroy')->middleware('no.impersonation');
        });

        Route::controller(PasswordController::class)->name('password.')->group(function () {
            Route::get('password', 'edit')->name('edit');
            Route::put('password', 'update')->name('update')->middleware('no.impersonation');
        });

        Route::get('appearance', AppearanceController::class)->name('appearance');
    });
});

// Workspace-scoped settings require an active workspace context (IdentifyWorkspace).
Route::middleware(['auth', 'workspace'])->prefix('settings')->group(function () {
    Route::controller(WorkspaceController::class)->name('workspace.')->group(function () {
        Route::get('workspace', 'edit')->name('edit');
        Route::patch('workspace', 'update')->name('update');
    });

    Route::controller(TeamController::class)->prefix('teams')->name('teams.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('{team}', 'update')->name('update');
        Route::patch('{team}/reparent', 'reparent')->name('reparent');
        Route::delete('{team}', 'destroy')->name('destroy');
    });

    Route::controller(MemberController::class)->prefix('members')->name('members.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('{member}', 'update')->name('update');
        Route::delete('{member}', 'destroy')->name('destroy');
    });
});
