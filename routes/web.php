<?php

use App\Http\Controllers\App\ContactsController;
use App\Http\Controllers\App\DashboardController;
use App\Http\Controllers\App\InboxesSettingsController;
use App\Http\Controllers\App\OnboardingsController;
use App\Http\Controllers\App\TeamsSettingsController;
use App\Http\Controllers\Auth\ConfirmationsController;
use App\Http\Controllers\Auth\PasswordsController;
use App\Http\Controllers\Auth\RegistrationsController;
use App\Http\Controllers\Auth\SessionsController;
use App\Models\Account;
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

// Devise passwords: không chặn guest (admin đã đăng nhập vẫn gửi reset cho agent).
Route::post('/app/auth/password', [PasswordsController::class, 'store'])
    ->middleware('throttle:5,1')->name('password_reset');
Route::get('/app/auth/reset/password', fn () => Inertia::render('v3/views/auth/reset/password/Index'))
    ->name('password_reset_form');
Route::get('/app/auth/password/edit', [PasswordsController::class, 'edit'])->name('password_edit');
Route::put('/app/auth/password', [PasswordsController::class, 'update'])->name('password_update');

Route::middleware('auth')->group(function () {
    Route::post('/app/logout', [SessionsController::class, 'destroy'])->name('logout');

    Route::get('/app', [DashboardController::class, 'index'])->name('dashboard');

    Route::middleware('account.scope')->prefix('/app/accounts/{account}')->whereNumber('account')->group(function () {
        Route::get('', fn (Account $account) => redirect("/app/accounts/{$account->id}/dashboard"));
        Route::get('/dashboard', [DashboardController::class, 'show'])->name('account_dashboard');

        Route::get('/onboarding', [OnboardingsController::class, 'show'])->name('onboarding');
        Route::post('/onboarding', [OnboardingsController::class, 'update']);

        Route::get('/profile/settings', fn (Account $account) => Inertia::render('dashboard/settings/profile/Index'))
            ->name('profile_settings');

        Route::middleware('account.role:administrator')->group(function () {
            Route::get('/settings/agents', fn (Account $account) => redirect("/app/accounts/{$account->id}/settings/agents/list"));
            Route::get('/settings/agents/list', fn (Account $account) => Inertia::render('dashboard/settings/agents/Index'))
                ->name('settings_agents');

            Route::get('/settings/teams', fn (Account $account) => redirect("/app/accounts/{$account->id}/settings/teams/list"));
            Route::get('/settings/teams/list', [TeamsSettingsController::class, 'index'])->name('settings_teams_list');
            Route::get('/settings/teams/new', [TeamsSettingsController::class, 'create'])->name('settings_teams_new');
            // Luồng tạo lồng dưới `new` như teams.routes.js, luồng sửa lồng dưới `{teamId}/edit`.
            Route::prefix('/settings/teams/new/{teamId}')->whereNumber('teamId')->group(function () {
                Route::get('/agents', [TeamsSettingsController::class, 'addAgents'])->name('settings_teams_add_agents');
                Route::get('/finish', [TeamsSettingsController::class, 'finish'])->name('settings_teams_finish');
            });
            Route::prefix('/settings/teams/{teamId}/edit')->whereNumber('teamId')->group(function () {
                Route::get('', [TeamsSettingsController::class, 'edit'])->name('settings_teams_edit');
                Route::get('/agents', [TeamsSettingsController::class, 'editAgents'])->name('settings_teams_edit_members');
                Route::get('/finish', [TeamsSettingsController::class, 'editFinish'])->name('settings_teams_edit_finish');
            });

            // Tương đương inbox.routes.js: list / wizard new 4 bước / trang settings có tab.
            Route::get('/settings/inboxes', fn (Account $account) => redirect("/app/accounts/{$account->id}/settings/inboxes/list"));
            Route::get('/settings/inboxes/list', [InboxesSettingsController::class, 'index'])->name('settings_inbox_list');
            Route::get('/settings/inboxes/new', [InboxesSettingsController::class, 'newChannelList'])->name('settings_inbox_new');
            Route::prefix('/settings/inboxes/new/{inboxId}')->whereNumber('inboxId')->group(function () {
                Route::get('/agents', [InboxesSettingsController::class, 'addAgents'])->name('settings_inboxes_add_agents');
                Route::get('/finish', [InboxesSettingsController::class, 'finish'])->name('settings_inbox_finish');
            });
            Route::get('/settings/inboxes/new/{subPage}', [InboxesSettingsController::class, 'newChannel'])
                ->where('subPage', '[a-z_]+')->name('settings_inboxes_page_channel');
            Route::get('/settings/inboxes/{inboxId}/{tab?}', [InboxesSettingsController::class, 'show'])
                ->whereNumber('inboxId')->where('tab', '[a-z-]+')->name('settings_inbox_show');
        });

        // Tương đương conversation.routes.js: home + inbox_conversation + inbox_dashboard.
        Route::get('/conversations/{conversationId}', [DashboardController::class, 'conversation'])
            ->whereNumber('conversationId')->name('inbox_conversation');
        Route::get('/inbox/{inboxId}', [DashboardController::class, 'inbox'])
            ->whereNumber('inboxId')->name('inbox_dashboard');
        Route::get('/inbox/{inboxId}/conversations/{conversationId}', [DashboardController::class, 'inbox'])
            ->whereNumber('inboxId')->whereNumber('conversationId')->name('conversation_through_inbox');

        // Tương đương contacts routes.js (admin + agent đều vào được).
        Route::get('/contacts', [ContactsController::class, 'index'])->name('contacts_dashboard');
        Route::get('/contacts/{contactId}', [ContactsController::class, 'show'])
            ->whereNumber('contactId')->name('contact_profile_dashboard');

        // Trang con chưa port (nhóm B→F): giữ đúng URL Chatwoot, render placeholder.
        Route::get('/{view}', [DashboardController::class, 'placeholder'])
            ->where('view', '.*')->name('account_view');
    });
});
