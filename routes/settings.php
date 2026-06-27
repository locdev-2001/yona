<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Settings\AppearanceController;
use App\Http\Controllers\Settings\EmailTemplateController;
use App\Http\Controllers\Settings\LeadSourceController;
use App\Http\Controllers\Settings\PipelineController;
use App\Http\Controllers\Settings\PipelineStageController;
use App\Http\Controllers\Settings\ProjectStatusController;
use Illuminate\Support\Facades\Route;
use Modules\Identity\Http\Controllers\Settings\MemberController;
use Modules\Identity\Http\Controllers\Settings\PasswordController;
use Modules\Identity\Http\Controllers\Settings\ProfileController;
use Modules\Identity\Http\Controllers\Settings\TeamController;
use Modules\Shared\Http\Controllers\Settings\CustomFieldController;
use Modules\Tenancy\Http\Controllers\Settings\WorkspaceController;

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

    // Lookups (P01): admin-only workspace reference data management.
    Route::prefix('lookups')->name('lookups.')->group(function () {
        // Pipelines
        Route::controller(PipelineController::class)->prefix('pipelines')->name('pipelines.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('{pipeline}', 'update')->name('update');
            Route::delete('{pipeline}', 'destroy')->name('destroy');
        });

        // Pipeline stages (nested under pipeline)
        Route::prefix('pipelines/{pipeline}/stages')->name('stages.')->group(function () {
            Route::post('/', [PipelineStageController::class, 'store'])->name('store');
        });
        Route::prefix('stages')->name('stage.')->group(function () {
            Route::patch('{stage}', [PipelineStageController::class, 'update'])->name('update');
            Route::delete('{stage}', [PipelineStageController::class, 'destroy'])->name('destroy');
        });

        // Lead sources
        Route::controller(LeadSourceController::class)->prefix('lead-sources')->name('lead-sources.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('{lead_source}', 'update')->name('update');
            Route::delete('{lead_source}', 'destroy')->name('destroy');
        });

        // Project statuses
        Route::controller(ProjectStatusController::class)->prefix('project-statuses')->name('project-statuses.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('{project_status}', 'update')->name('update');
            Route::delete('{project_status}', 'destroy')->name('destroy');
        });
    });

    // Email templates (P05) — admin edit/preview/test workspace templates.
    Route::controller(EmailTemplateController::class)->prefix('email-templates')->name('email-templates.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('{template}', 'edit')->name('edit');
        Route::patch('{template}', 'update')->name('update');
        Route::post('{template}/test', 'test')->name('test');
    });

    // Custom fields (P02) — admin CRUD for field definitions per entity_type.
    Route::controller(CustomFieldController::class)->prefix('custom-fields')->name('custom-fields.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('{definition}', 'update')->name('update');
        Route::delete('{definition}', 'destroy')->name('destroy');
    });
});
