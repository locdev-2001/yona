<?php

use Illuminate\Support\Facades\Route;
use Modules\Email\Http\Controllers\Settings\EmailTemplateController;

// Email templates settings (workspace-scoped).
// 'web' group wraps these so session + CSRF are applied (loadRoutesFrom skips
// the main web.php group wrapper; must be explicit here).
Route::middleware(['web', 'auth', 'workspace'])
    ->prefix('settings')
    ->group(function () {
        Route::controller(EmailTemplateController::class)
            ->prefix('email-templates')
            ->name('email-templates.')
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::get('{template}', 'edit')->name('edit');
                Route::patch('{template}', 'update')->name('update');
                Route::post('{template}/test', 'test')->name('test');
            });
    });
