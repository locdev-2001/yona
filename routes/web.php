<?php

use App\Http\Controllers\App\ContactsController;
use App\Http\Controllers\App\DashboardController;
use App\Http\Controllers\App\InboxesSettingsController;
use App\Http\Controllers\App\OnboardingsController;
use App\Http\Controllers\App\TeamsSettingsController;
use App\Http\Controllers\AttachmentsController;
use App\Http\Controllers\Auth\ConfirmationsController;
use App\Http\Controllers\Auth\PasswordsController;
use App\Http\Controllers\Auth\RegistrationsController;
use App\Http\Controllers\Auth\SessionsController;
use App\Models\Account;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Chuyển hướng tệp đính kèm: URL kết thúc bằng tên tệp gốc rồi 301 sang tệp
// thật, đúng hành vi ActiveStorage của bản gốc.
Route::get('/attachments/{attachment}/{filename}', [AttachmentsController::class, 'show'])
    ->whereNumber('attachment')->where('filename', '.*')->name('attachments.show');

Route::redirect('/', '/app');

// Trang widget chạy trong iframe của SDK (`/widget?website_token=...`) — không
// dùng layout dashboard, không cần đăng nhập; phiên khách dựng qua API widget.
Route::get('/widget', fn () => view('widget'))->name('widget');

// Trang khảo sát CSAT công khai (`/survey/responses/{uuid}`) — khách chấm điểm
// ngoài widget; dữ liệu đi qua mặt tiền public API, trang chỉ nhúng cấu hình
// cài đặt như bản gốc.
Route::get('/survey/responses/{uuid}', fn () => view('survey', ['globalConfig' => [
    'LOGO_THUMBNAIL' => config('yona.branding.logo_thumbnail'),
    'BRAND_NAME' => config('yona.branding.brand_name'),
    'WIDGET_BRAND_URL' => config('yona.branding.widget_brand_url'),
    'INSTALLATION_NAME' => config('yona.branding.installation_name'),
]]))->name('survey_response');

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

            // Tương đương labels.routes.js (administrator, redirect về /list).
            Route::get('/settings/labels', fn (Account $account) => redirect("/app/accounts/{$account->id}/settings/labels/list"));
            Route::get('/settings/labels/list', fn (Account $account) => Inertia::render('dashboard/settings/labels/Index'))
                ->name('settings_labels_list');

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

            // Tương đương campaigns.routes.js: `/campaigns` và `/campaigns/ongoing`
            // chuyển tiếp về tab Live chat; SMS/WhatsApp thuộc nhóm E/F.
            Route::get('/campaigns', fn (Account $account) => redirect("/app/accounts/{$account->id}/campaigns/live_chat"));
            Route::get('/campaigns/ongoing', fn (Account $account) => redirect("/app/accounts/{$account->id}/campaigns/live_chat"));
            Route::get('/campaigns/live_chat', fn (Account $account) => Inertia::render('dashboard/campaigns/LiveChat'))
                ->name('campaigns_livechat_index');

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

            // Tương đương conversationWorkflow.routes.js.
            Route::get('/settings/conversation-workflow', fn (Account $account) => Inertia::render('dashboard/settings/conversationWorkflow/Index'))
                ->name('conversation_workflow_index');
        });

        // Tương đương canned.routes.js: mọi vai trò có quyền hội thoại (không riêng
        // administrator), redirect về /list.
        Route::get('/settings/canned-response', fn (Account $account) => redirect("/app/accounts/{$account->id}/settings/canned-response/list"));
        Route::get('/settings/canned-response/list', fn (Account $account) => Inertia::render('dashboard/settings/canned/Index'))
            ->name('settings_canned_list');

        // Tương đương conversation.routes.js: home + inbox_conversation + inbox_dashboard
        // + team_conversations.
        Route::get('/conversations/{conversationId}', [DashboardController::class, 'conversation'])
            ->whereNumber('conversationId')->name('inbox_conversation');
        Route::get('/inbox/{inboxId}', [DashboardController::class, 'inbox'])
            ->whereNumber('inboxId')->name('inbox_dashboard');
        Route::get('/inbox/{inboxId}/conversations/{conversationId}', [DashboardController::class, 'inbox'])
            ->whereNumber('inboxId')->whereNumber('conversationId')->name('conversation_through_inbox');
        Route::get('/team/{teamId}', [DashboardController::class, 'team'])
            ->whereNumber('teamId')->name('team_conversations');
        Route::get('/team/{teamId}/conversations/{conversationId}', [DashboardController::class, 'team'])
            ->whereNumber('teamId')->whereNumber('conversationId')->name('conversations_through_team');
        Route::get('/label/{label}', [DashboardController::class, 'label'])
            ->name('label_conversations');
        Route::get('/label/{label}/conversations/{conversationId}', [DashboardController::class, 'label'])
            ->whereNumber('conversationId')->name('conversations_through_label');

        // Tương đương conversation.routes.js: conversation_mentions +
        // conversation_through_mentions — cùng màn ConversationView, khác mỗi
        // prop `conversationType` để ChatList lọc conversation_type=mention.
        Route::get('/mentions/conversations', fn () => Inertia::render('dashboard/conversation/ConversationView', [
            'conversationType' => 'mention',
        ]))->name('conversation_mentions');
        Route::get('/mentions/conversations/{conversationId}', fn (Account $account, int $conversationId) => Inertia::render(
            'dashboard/conversation/ConversationView',
            ['conversationId' => $conversationId, 'conversationType' => 'mention'],
        ))->whereNumber('conversationId')->name('conversation_through_mentions');

        // Tương đương inbox.routes.js: trung tâm thông báo (`inbox_view` +
        // `inbox_view_conversation`) — cùng một màn, khác mỗi hội thoại đang mở.
        Route::get('/inbox-view', fn () => Inertia::render('dashboard/notifications/InboxList'))
            ->name('inbox_view');
        Route::get('/inbox-view/{type}/{conversationId}', fn (Account $account, string $type, int $conversationId) => Inertia::render(
            'dashboard/notifications/InboxList',
            ['conversationId' => $conversationId],
        ))->where('type', '[a-z_]+')->whereNumber('conversationId')->name('inbox_view_conversation');

        // Tương đương contacts routes.js (admin + agent đều vào được).
        Route::get('/contacts', [ContactsController::class, 'index'])->name('contacts_dashboard');
        Route::get('/contacts/{contactId}', [ContactsController::class, 'show'])
            ->whereNumber('contactId')->name('contact_profile_dashboard');

        // Trang con chưa port (nhóm B→F): giữ đúng URL Chatwoot, render placeholder.
        Route::get('/{view}', [DashboardController::class, 'placeholder'])
            ->where('view', '.*')->name('account_view');
    });
});
