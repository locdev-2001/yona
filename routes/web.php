<?php

use App\Http\Controllers\App\ContactsController;
use App\Http\Controllers\App\DashboardController;
use App\Http\Controllers\App\InboxesSettingsController;
use App\Http\Controllers\App\OnboardingsController;
use App\Http\Controllers\App\TeamsSettingsController;
use App\Http\Controllers\AttachmentsController;
use App\Http\Controllers\Auth\ConfirmationsController;
use App\Http\Controllers\Auth\InviteAcceptancesController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\Auth\PasswordsController;
use App\Http\Controllers\Auth\RegistrationsController;
use App\Http\Controllers\Auth\SessionsController;
use App\Http\Controllers\DemoRequestsController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\LegalPagesController;
use App\Http\Controllers\Public\FlowsController;
use App\Http\Controllers\Public\Portals\ArticlesController as PublicArticlesController;
use App\Http\Controllers\Public\Portals\CategoriesController as PublicCategoriesController;
use App\Http\Controllers\Public\Portals\PortalsController as PublicPortalsController;
use App\Http\Controllers\Public\Portals\SearchController as PublicSearchController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\SuperAdmin\AccessTokensController as SuperAdminAccessTokensController;
use App\Http\Controllers\SuperAdmin\AccountsController as SuperAdminAccountsController;
use App\Http\Controllers\SuperAdmin\AccountUsersController as SuperAdminAccountUsersController;
use App\Http\Controllers\SuperAdmin\AgentBotsController as SuperAdminAgentBotsController;
use App\Http\Controllers\SuperAdmin\AppConfigsController as SuperAdminAppConfigsController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\ImpersonationsController as SuperAdminImpersonationsController;
use App\Http\Controllers\SuperAdmin\InstallationConfigsController as SuperAdminInstallationConfigsController;
use App\Http\Controllers\SuperAdmin\InstanceStatusesController as SuperAdminInstanceStatusesController;
use App\Http\Controllers\SuperAdmin\MfaController as SuperAdminMfaController;
use App\Http\Controllers\SuperAdmin\PlatformAppsController as SuperAdminPlatformAppsController;
use App\Http\Controllers\SuperAdmin\SessionsController as SuperAdminSessionsController;
use App\Http\Controllers\SuperAdmin\SettingsController as SuperAdminSettingsController;
use App\Http\Controllers\SuperAdmin\StickerPacksController as SuperAdminStickerPacksController;
use App\Http\Controllers\SuperAdmin\UsersController as SuperAdminUsersController;
use App\Http\Middleware\EnsureAccountFeatureEnabled;
use App\Http\Middleware\EnsureSuperAdminMfaEnrolled;
use App\Http\Middleware\RestrictWidgetEmbedding;
use App\Http\Middleware\SuperAdminInertia;
use App\Models\Account;
use App\Models\Sticker;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Chuyển hướng tệp đính kèm: URL kết thúc bằng tên tệp gốc rồi 301 sang tệp
// thật, đúng hành vi ActiveStorage của bản gốc. `{token}` là chữ ký HMAC của id
// (kèm hạn dùng cho URL gửi ra ngoài) — chỗ ActiveStorage đặt `signed_id`.
Route::get('/attachments/{attachment}/{token}/{filename}', [AttachmentsController::class, 'show'])
    ->whereNumber('attachment')->where('filename', '.*')->name('attachments.show');

// Trang chủ công khai (nhánh `main` mang sang): gốc tên miền là trang giới thiệu
// sản phẩm, không đẩy thẳng khách vào màn đăng nhập như bản gốc.
Route::get('/', [LandingController::class, 'home'])->name('home');

// Trang một-kênh cho Zalo cá nhân: điểm khác biệt của sản phẩm cần một trang
// riêng để xếp hạng và để gửi link cho khách đang hỏi về Zalo.
Route::get('/zalo-ca-nhan', [LandingController::class, 'zaloPersonal'])->name('channels.zalo_personal');

// Đặt lịch demo — kênh thu lead chạy được khi luồng tự đăng ký còn chặn. POST bị
// giới hạn 5 lượt / 10 phút mỗi IP: form công khai không có gì ngăn bot ngoài
// bẫy honeypot trong controller.
Route::get('/dat-lich-demo', [DemoRequestsController::class, 'create'])->name('demo_request.create');
Route::post('/dat-lich-demo', [DemoRequestsController::class, 'store'])
    ->middleware('throttle:5,10')->name('demo_request.store');
Route::get('/dat-lich-demo/cam-on', [DemoRequestsController::class, 'thanks'])->name('demo_request.thanks');

// Hai trang pháp lý mà trang đăng ký và footer trỏ tới. `/terms` và
// `/privacy-policy` là URL mặc định cũ của TERMS_URL/PRIVACY_URL, đã in dưới nút
// đăng ký, nên chuyển hướng vĩnh viễn thay vì để 404.
Route::get('/dieu-khoan', [LegalPagesController::class, 'terms'])->name('legal.terms');
Route::get('/chinh-sach-rieng-tu', [LegalPagesController::class, 'privacy'])->name('legal.privacy');
Route::permanentRedirect('/terms', '/dieu-khoan');
Route::permanentRedirect('/privacy-policy', '/chinh-sach-rieng-tu');

// sitemap.xml cho công cụ tìm kiếm — chỉ liệt kê trang thật đang trả 200.
Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');

// Web app manifest: tên và màu lấy từ cấu hình thương hiệu nên phải sinh động,
// không đặt tệp tĩnh trong public/. `maskable` là bản nền đặc riêng — Android
// cắt icon theo mặt nạ nên bản bo góc nền trong suốt sẽ lẹm vào logo.
Route::get('/site.webmanifest', fn () => response()->json([
    'name' => config('yona.branding.installation_name'),
    'short_name' => config('yona.branding.brand_name'),
    'start_url' => '/app',
    'scope' => '/',
    'display' => 'standalone',
    'theme_color' => config('yona.branding.theme_color'),
    'background_color' => config('yona.branding.theme_color'),
    'icons' => [
        ['src' => '/app-icon-192x192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
        ['src' => '/app-icon-512x512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
        ['src' => '/pwa-maskable-512x512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
    ],
], options: JSON_UNESCAPED_SLASHES)->header('Content-Type', 'application/manifest+json'))->name('site_manifest');

// Trang widget chạy trong iframe của SDK (`/widget?website_token=...`) — không
// dùng layout dashboard, không cần đăng nhập; phiên khách dựng qua API widget.
Route::get('/widget', fn () => view('widget'))->middleware(RestrictWidgetEmbedding::class)->name('widget');

// Trang khảo sát CSAT công khai (`/survey/responses/{uuid}`) — khách chấm điểm
// ngoài widget; dữ liệu đi qua mặt tiền public API, trang chỉ nhúng cấu hình
// cài đặt như bản gốc.
Route::get('/survey/responses/{uuid}', fn () => view('survey', ['globalConfig' => [
    'LOGO_THUMBNAIL' => config('yona.branding.logo_thumbnail'),
    'BRAND_NAME' => config('yona.branding.brand_name'),
    'WIDGET_BRAND_URL' => config('yona.branding.widget_brand_url'),
    'INSTALLATION_NAME' => config('yona.branding.installation_name'),
]]))->name('survey_response');

// Trang công khai theo token (`/m/{token}`, phase-05 §C) — link Yona gửi kèm tin
// Zalo/SMS khi kênh không vẽ được thẻ gốc (schedule, form dài, theo dõi đơn,
// chuyển khoản, chi tiết sản phẩm). Token sai/hết hạn/đã dùng: 404 ở FlowsController.
Route::get('/m/{token}', [FlowsController::class, 'page'])->where('token', '[0-9A-Za-z]+')->name('flows.page');

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

    // Đăng nhập / đăng ký bằng nhà cung cấp OAuth (Google). Nhà cung cấp chưa cấu hình → 404.
    Route::middleware('throttle:oauth-sign-in')->group(function () {
        Route::get('/app/auth/oauth/{provider}', [OAuthController::class, 'redirect'])->name('oauth.redirect');
        Route::get('/app/auth/oauth/{provider}/callback', [OAuthController::class, 'callback'])->name('oauth.callback');
    });
});

Route::get('/app/auth/confirmation', [ConfirmationsController::class, 'show'])->name('confirmation');

// Devise passwords: không chặn guest (admin đã đăng nhập vẫn gửi reset cho agent).
Route::post('/app/auth/password', [PasswordsController::class, 'store'])
    ->middleware('throttle:5,1')->name('password_reset');
Route::get('/app/auth/reset/password', fn () => Inertia::render('v3/views/auth/reset/password/Index'))
    ->name('password_reset_form');
Route::get('/app/auth/password/edit', [PasswordsController::class, 'edit'])->name('password_edit');
Route::put('/app/auth/password', [PasswordsController::class, 'update'])->name('password_update');

// Link mời tự phục vụ: không nằm sau 'guest' hay 'auth' vì phục vụ cả khách
// chưa có tài khoản (ký mật khẩu tại chỗ) lẫn người đã đăng nhập (tham gia một
// chạm). POST giới hạn tốc độ vì đây là điểm công khai, ai giữ được link cũng gọi tới được.
Route::get('/invite/{token}', [InviteAcceptancesController::class, 'show'])
    ->where('token', '[A-Za-z0-9]+')->name('invite_links.show');
Route::post('/invite/{token}', [InviteAcceptancesController::class, 'store'])
    ->where('token', '[A-Za-z0-9]+')->middleware('throttle:10,1')->name('invite_links.accept');

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

            // Trang "Bài cập nhật trên widget" (tab Cập nhật của widget) — administrator only.
            Route::get('/settings/widget-updates', fn (Account $account) => Inertia::render('dashboard/settings/widgetUpdates/Index'))
                ->name('settings_widget_updates');
            // Chuyển khoản (Cài đặt / Tài khoản / Chuyển khoản): quản trị viên cấu
            // hình tài khoản nhận tiền + mã QR VietQR.
            Route::get('/settings/payment-accounts', fn (Account $account) => Inertia::render('dashboard/settings/paymentAccounts/Index'))
                ->name('settings_payment_accounts');
            // Kho sticker riêng: chỉ tồn tại khi account bật cờ custom_stickers.
            Route::get('/settings/custom-stickers', fn (Account $account) => Inertia::render('dashboard/settings/customStickers/Index'))
                ->middleware(EnsureAccountFeatureEnabled::class.':'.Sticker::CUSTOM_STICKERS_FEATURE)
                ->name('settings_custom_stickers');

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
                // G1: bước quét QR có URL riêng như mọi bước khác của wizard — F5
                // hay bấm quay lại KHÔNG được tạo thêm hộp thư mồ côi.
                Route::get('/zalo', [InboxesSettingsController::class, 'connectZalo'])->name('settings_inboxes_connect_zalo');
                Route::get('/agents', [InboxesSettingsController::class, 'addAgents'])->name('settings_inboxes_add_agents');
                Route::get('/finish', [InboxesSettingsController::class, 'finish'])->name('settings_inbox_finish');
            });
            Route::get('/settings/inboxes/new/{subPage}', [InboxesSettingsController::class, 'newChannel'])
                ->where('subPage', '[a-z_]+')->name('settings_inboxes_page_channel');
            // Màn "Widget chat" (nhóm D) — trang riêng, không phải tab của Show.tsx.
            // Đăng ký trước route {tab?} bên dưới vì "widget" cũng khớp regex tab đó.
            Route::get('/settings/inboxes/{inboxId}/widget', [InboxesSettingsController::class, 'widgetBuilder'])
                ->whereNumber('inboxId')->name('settings_inbox_widget_builder');
            Route::get('/settings/inboxes/{inboxId}/{tab?}', [InboxesSettingsController::class, 'show'])
                ->whereNumber('inboxId')->where('tab', '[a-z-]+')->name('settings_inbox_show');

            Route::get('/settings/general', fn (Account $account) => Inertia::render('dashboard/settings/account/Index', [
                'availableLocales' => config('yona.available_locales'),
            ]))->name('general_settings_index');

            // Tương đương conversationWorkflow.routes.js.
            Route::get('/settings/conversation-workflow', fn (Account $account) => Inertia::render('dashboard/settings/conversationWorkflow/Index'))
                ->name('conversation_workflow_index');

            // D2 Reports (reports.routes.js): cả bộ route cũ lẫn bộ drilldown mới đều đăng ký.
            Route::get('/reports', fn (Account $account) => redirect("/app/accounts/{$account->id}/reports/overview"));
            Route::get('/reports/overview', fn () => Inertia::render('dashboard/reports/LiveReports'))->name('account_overview_reports');
            Route::get('/reports/conversation', fn () => Inertia::render('dashboard/reports/Index'))->name('conversation_reports');
            Route::get('/reports/csat', fn () => Inertia::render('dashboard/reports/CsatResponses'))->name('csat_reports');
            Route::get('/reports/bot', fn () => Inertia::render('dashboard/reports/BotReports'))->name('bot_reports');
            Route::get('/reports/agent', fn () => Inertia::render('dashboard/reports/AgentReports'))->name('agent_reports');
            Route::get('/reports/inboxes', fn () => Inertia::render('dashboard/reports/InboxReports'))->name('inbox_reports');
            Route::get('/reports/label', fn () => Inertia::render('dashboard/reports/LabelReports'))->name('label_reports');
            Route::get('/reports/teams', fn () => Inertia::render('dashboard/reports/TeamReports'))->name('team_reports');
            foreach (['agent' => 'agents', 'inbox' => 'inboxes', 'team' => 'teams', 'label' => 'labels'] as $singular => $plural) {
                $page = ucfirst($singular).'Reports';
                Route::get("/reports/{$plural}_overview", fn () => Inertia::render("dashboard/reports/{$page}Index"))->name("{$singular}_reports_index");
                Route::get("/reports/{$plural}/{id}", fn (Account $account, int $id) => Inertia::render("dashboard/reports/{$page}Show", ['id' => $id]))
                    ->whereNumber('id')->name("{$singular}_reports_show");
            }

            // E1 attributes.routes.js.
            Route::get('/settings/custom-attributes', fn (Account $account) => redirect("/app/accounts/{$account->id}/settings/custom-attributes/list"));
            Route::get('/settings/custom-attributes/list', fn () => Inertia::render('dashboard/settings/attributes/Index'))
                ->name('attributes_list');

            // D4: settings/agent-bots + settings/integrations (integrations.routes.js).
            Route::get('/settings/agent-bots', fn () => Inertia::render('dashboard/settings/agentBots/Index'))
                ->name('agent_bots');
            Route::get('/settings/integrations', fn () => Inertia::render('dashboard/settings/integrations/Index'))
                ->name('settings_applications');
            Route::get('/settings/integrations/webhook', fn () => Inertia::render('dashboard/settings/integrations/Webhooks/Index'))
                ->name('settings_integrations_webhook');
            Route::get('/settings/integrations/dashboard_apps', fn () => Inertia::render('dashboard/settings/integrations/DashboardApps/Index'))
                ->name('settings_integrations_dashboard_apps');
            // F6: trang Slack riêng (integrations.routes.js) — PHẢI đứng trước route
            // `{integrationId}` vì regex [a-z_]+ khớp cả 'slack'.
            Route::get('/settings/integrations/slack', fn (Account $account) => Inertia::render(
                'dashboard/settings/integrations/Slack',
                ['code' => request()->query('code')],
            ))->name('settings_integrations_slack');
            Route::get('/settings/integrations/{integrationId}', fn (Account $account, string $integrationId) => Inertia::render(
                'dashboard/settings/integrations/ShowIntegration',
                ['integrationId' => $integrationId],
            ))->where('integrationId', '[a-z_]+')->name('settings_integrations_integration');

            Route::get('/settings/automation', fn (Account $account) => redirect("/app/accounts/{$account->id}/settings/automation/list"));
            Route::get('/settings/automation/list', fn () => Inertia::render('dashboard/settings/automation/Index'))
                ->name('settings_automation_list');
        });

        // D3 Macros (macros.routes.js): mọi vai trò; list + editor new/edit.
        Route::get('/settings/macros', fn () => Inertia::render('dashboard/settings/macros/Index'))
            ->name('macros_wrapper');
        Route::get('/settings/macros/new', fn () => Inertia::render('dashboard/settings/macros/MacroEditor'))
            ->name('macros_new');
        Route::get('/settings/macros/{macroId}/edit', fn (Account $account, int $macroId) => Inertia::render(
            'dashboard/settings/macros/MacroEditor',
            ['macroId' => $macroId],
        ))->whereNumber('macroId')->name('macros_edit');

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

        // E1 folder (custom view hội thoại) + segment (custom view liên hệ).
        Route::get('/custom_view/{foldersId}', fn (Account $account, int $foldersId) => Inertia::render('dashboard/conversation/ConversationView', [
            'foldersId' => $foldersId,
        ]))->whereNumber('foldersId')->name('folder_conversations');
        Route::get('/custom_view/{foldersId}/conversations/{conversationId}', fn (Account $account, int $foldersId, int $conversationId) => Inertia::render(
            'dashboard/conversation/ConversationView',
            ['foldersId' => $foldersId, 'conversationId' => $conversationId],
        ))->whereNumber('foldersId')->whereNumber('conversationId')->name('conversations_through_folders');
        Route::get('/contacts/segments/{segmentId}', fn (Account $account, int $segmentId) => Inertia::render('dashboard/contacts/Index', [
            'segmentId' => $segmentId,
        ]))->whereNumber('segmentId')->name('contacts_dashboard_segments_index');
        Route::get('/contacts/{contactId}/segments/{segmentId}', [ContactsController::class, 'show'])
            ->whereNumber('contactId')->whereNumber('segmentId')->name('contacts_edit_segment');

        // E4 helpcenter.routes.js — BEGIN (agent e4-fe sở hữu khối này)
        // Giữ nguyên URL của vue-router gốc. Tham số `:categorySlug?` nằm giữa
        // đường dẫn nên phải đăng ký cả hai biến thể (có/không có danh mục), và
        // route cụ thể phải đứng trước route bắt chung.
        Route::prefix('/portals')->group(function () {
            Route::get('/new', fn (Account $account) => Inertia::render('dashboard/helpcenter/pages/PortalsNew'))
                ->name('portals_new');

            Route::get('/{portalSlug}/locales', fn (Account $account, string $portalSlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsLocalesIndex',
                ['portalSlug' => $portalSlug],
            ))->name('portals_locales_index');

            Route::get('/{portalSlug}/settings', fn (Account $account, string $portalSlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsSettingsIndex',
                ['portalSlug' => $portalSlug],
            ))->name('portals_settings_index');

            Route::get('/{portalSlug}/{locale}/categories', fn (Account $account, string $portalSlug, string $locale) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsCategoriesIndex',
                ['portalSlug' => $portalSlug, 'locale' => $locale],
            ))->name('portals_categories_index');

            Route::get('/{portalSlug}/{locale}/categories/{categorySlug}/articles/new', fn (Account $account, string $portalSlug, string $locale, string $categorySlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesNew',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'categorySlug' => $categorySlug, 'isCategoryArticles' => true],
            ))->name('portals_categories_articles_new');

            Route::get('/{portalSlug}/{locale}/categories/{categorySlug}/articles', fn (Account $account, string $portalSlug, string $locale, string $categorySlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesIndex',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'categorySlug' => $categorySlug, 'isCategoryArticles' => true],
            ))->name('portals_categories_articles_index');

            Route::get('/{portalSlug}/{locale}/categories/{categorySlug}/articles/{articleSlug}', fn (Account $account, string $portalSlug, string $locale, string $categorySlug, string $articleSlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesEdit',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'categorySlug' => $categorySlug, 'articleSlug' => $articleSlug, 'isCategoryArticles' => true],
            ))->name('portals_categories_articles_edit');

            Route::get('/{portalSlug}/{locale}/articles/new', fn (Account $account, string $portalSlug, string $locale) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesNew',
                ['portalSlug' => $portalSlug, 'locale' => $locale],
            ))->name('portals_articles_new');

            Route::get('/{portalSlug}/{locale}/{categorySlug}/articles/new', fn (Account $account, string $portalSlug, string $locale, string $categorySlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesNew',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'categorySlug' => $categorySlug],
            ))->name('portals_articles_new_in_category');

            Route::get('/{portalSlug}/{locale}/articles/edit/{articleSlug}', fn (Account $account, string $portalSlug, string $locale, string $articleSlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesEdit',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'articleSlug' => $articleSlug],
            ))->name('portals_articles_edit');

            Route::get('/{portalSlug}/{locale}/articles/{tab}/edit/{articleSlug}', fn (Account $account, string $portalSlug, string $locale, string $tab, string $articleSlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesEdit',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'tab' => $tab, 'articleSlug' => $articleSlug],
            ))->where('tab', 'all|mine|draft|archived')->name('portals_articles_edit_tab');

            Route::get('/{portalSlug}/{locale}/{categorySlug}/articles/{tab}/edit/{articleSlug}', fn (Account $account, string $portalSlug, string $locale, string $categorySlug, string $tab, string $articleSlug) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesEdit',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'categorySlug' => $categorySlug, 'tab' => $tab, 'articleSlug' => $articleSlug],
            ))->where('tab', 'all|mine|draft|archived')->name('portals_articles_edit_category_tab');

            Route::get('/{portalSlug}/{locale}/articles/{tab?}', fn (Account $account, string $portalSlug, string $locale, ?string $tab = null) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesIndex',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'tab' => $tab],
            ))->where('tab', 'all|mine|draft|archived')->name('portals_articles_index');

            Route::get('/{portalSlug}/{locale}/{categorySlug}/articles/{tab?}', fn (Account $account, string $portalSlug, string $locale, string $categorySlug, ?string $tab = null) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsArticlesIndex',
                ['portalSlug' => $portalSlug, 'locale' => $locale, 'categorySlug' => $categorySlug, 'tab' => $tab],
            ))->where('tab', 'all|mine|draft|archived')->name('portals_articles_index_in_category');

            Route::get('/{navigationPath?}', fn (Account $account, ?string $navigationPath = null) => Inertia::render(
                'dashboard/helpcenter/pages/PortalsIndex',
                ['navigationPath' => $navigationPath],
            ))->name('portals_index');
        });
        // E4 helpcenter.routes.js — END

        // E3 contacts/data routes — BEGIN (agent e3-fe sở hữu khối này)
        // contacts routes.js: nhánh lọc theo nhãn + tab Active. Đặt sau
        // `/contacts/{contactId}` được vì tham số đó bị ràng buộc whereNumber.
        Route::get('/contacts/active', [ContactsController::class, 'active'])->name('contacts_dashboard_active');
        Route::get('/contacts/labels/{label}', [ContactsController::class, 'label'])
            ->name('contacts_dashboard_labels_index');
        Route::get('/contacts/{contactId}/labels/{label}', [ContactsController::class, 'show'])
            ->whereNumber('contactId')->name('contacts_edit_label');
        // E3 contacts/data routes — END

        // F8 MFA/sessions pages — BEGIN (agent f8 sở hữu khối này)
        // profile.routes.js: trang con `mfa` của profile settings.
        Route::get('/profile/mfa', fn (Account $account) => Inertia::render('dashboard/settings/profile/mfa/MfaSettings'))
            ->name('profile_settings_mfa');
        // F8 MFA/sessions pages — END

        // F6 dashboard apps pages — BEGIN (agent f6 sở hữu khối này)
        // F6 dashboard apps pages — END

        // E2 search.routes.js.
        Route::get('/search/{tab?}', fn (Account $account, ?string $tab = null) => Inertia::render('dashboard/search/SearchView', [
            'tab' => $tab,
        ]))->where('tab', 'conversations|messages|contacts|files|articles')->name('search');

        // Trang con chưa port (nhóm B→F): giữ đúng URL cũ, render placeholder.
        Route::get('/{view}', [DashboardController::class, 'placeholder'])
            ->where('view', '.*')->name('account_view');
    });
});

// E4 Help Center công khai (public/api/v1/portals*): không auth; thứ tự route articles/.md/.png
// phải đứng trước {locale}.
Route::prefix('/hc')->group(function () {
    Route::get('/{slug}/sitemap.xml', [PublicPortalsController::class, 'sitemap']);
    Route::get('/{slug}/articles/{articleSlug}.md', [PublicArticlesController::class, 'showMarkdown']);
    Route::get('/{slug}/articles/{articleSlug}.png', [PublicArticlesController::class, 'trackingPixel']);
    Route::get('/{slug}/articles', [PublicArticlesController::class, 'index']);
    Route::get('/{slug}/articles/{articleSlug}', [PublicArticlesController::class, 'show']);
    Route::get('/{slug}/{locale}/search', [PublicSearchController::class, 'index']);
    Route::get('/{slug}/{locale}/articles', [PublicArticlesController::class, 'index']);
    Route::get('/{slug}/{locale}/categories', [PublicCategoriesController::class, 'index']);
    Route::get('/{slug}/{locale}/categories/{categorySlug}', [PublicCategoriesController::class, 'show']);
    Route::get('/{slug}/{locale}/categories/{categorySlug}/articles', [PublicArticlesController::class, 'index']);
    Route::get('/{slug}/{locale}', [PublicPortalsController::class, 'show']);
    Route::get('/{slug}', [PublicPortalsController::class, 'show']);
});

// F7 Super Admin (/super_admin/*) — BEGIN (agent f7 sở hữu khối này)
// Port từ `devise_for :super_admins` + `namespace :super_admin` trong
// Guard riêng `super_admin`, layout riêng.
Route::prefix('super_admin')->middleware(SuperAdminInertia::class)->group(function () {
    Route::middleware('guest:super_admin')->group(function () {
        Route::get('/sign_in', [SuperAdminSessionsController::class, 'create'])->name('super_admin.login');
        Route::post('/sign_in', [SuperAdminSessionsController::class, 'store']);
    });

    Route::middleware('auth:super_admin')->group(function () {
        Route::match(['get', 'delete'], '/logout', [SuperAdminSessionsController::class, 'destroy']);

        Route::get('/mfa/setup', [SuperAdminMfaController::class, 'setupPage'])->name('super_admin.mfa.setup');
        Route::post('/mfa', [SuperAdminMfaController::class, 'store']);
        Route::post('/mfa/verify', [SuperAdminMfaController::class, 'verify']);

        Route::middleware(EnsureSuperAdminMfaEnrolled::class)->group(function () {
            Route::get('/', [SuperAdminDashboardController::class, 'index'])->name('super_admin.root');

            Route::get('/app_config', [SuperAdminAppConfigsController::class, 'show']);
            Route::post('/app_config', [SuperAdminAppConfigsController::class, 'store']);
            Route::get('/settings', [SuperAdminSettingsController::class, 'show']);
            Route::get('/instance_status', [SuperAdminInstanceStatusesController::class, 'show']);

            // Kho sticker chung: trang + JSON cho trang (dùng chung khung với kho riêng của tenant).
            Route::get('/sticker_packs', [SuperAdminStickerPacksController::class, 'page']);
            Route::prefix('/api/sticker_packs')->group(function () {
                Route::get('/', [SuperAdminStickerPacksController::class, 'index']);
                Route::post('/', [SuperAdminStickerPacksController::class, 'store']);
                Route::get('/{packId}', [SuperAdminStickerPacksController::class, 'show'])->whereNumber('packId');
                Route::match(['put', 'patch'], '/{packId}', [SuperAdminStickerPacksController::class, 'update'])->whereNumber('packId');
                Route::delete('/{packId}', [SuperAdminStickerPacksController::class, 'destroy'])->whereNumber('packId');
                Route::post('/{packId}/publish', [SuperAdminStickerPacksController::class, 'publish'])->whereNumber('packId');
                Route::post('/{packId}/unpublish', [SuperAdminStickerPacksController::class, 'unpublish'])->whereNumber('packId');
                Route::post('/{packId}/stickers', [SuperAdminStickerPacksController::class, 'upload'])
                    ->whereNumber('packId')
                    ->middleware('throttle:sticker-uploads');
                Route::put('/{packId}/stickers/order', [SuperAdminStickerPacksController::class, 'reorder'])->whereNumber('packId');
                Route::patch('/{packId}/stickers/{stickerId}', [SuperAdminStickerPacksController::class, 'updateSticker'])
                    ->whereNumber(['packId', 'stickerId']);
                Route::delete('/{packId}/stickers/{stickerId}', [SuperAdminStickerPacksController::class, 'destroySticker'])
                    ->whereNumber(['packId', 'stickerId']);
            });

            Route::post('/accounts/{id}/reset_cache', [SuperAdminAccountsController::class, 'resetCache'])->whereNumber('id');

            Route::delete('/users/{id}/avatar', [SuperAdminUsersController::class, 'destroyAvatar'])->whereNumber('id');
            Route::post('/users/{id}/resend_confirmation', [SuperAdminUsersController::class, 'resendConfirmation'])->whereNumber('id');
            Route::post('/users/{id}/impersonate', [SuperAdminUsersController::class, 'impersonate'])->whereNumber('id');

            Route::delete('/agent_bots/{id}/avatar', [SuperAdminAgentBotsController::class, 'destroyAvatar'])->whereNumber('id');

            Route::get('/account_users/{id}', [SuperAdminAccountUsersController::class, 'show'])->whereNumber('id');
            Route::post('/account_users', [SuperAdminAccountUsersController::class, 'store']);
            Route::delete('/account_users/{id}', [SuperAdminAccountUsersController::class, 'destroy'])->whereNumber('id');

            // Nhật ký đăng nhập hộ — chỉ đọc, không CRUD như các resource khác.
            Route::get('/impersonations', [SuperAdminImpersonationsController::class, 'index']);
            Route::get('/impersonations/{id}', [SuperAdminImpersonationsController::class, 'show'])->whereNumber('id');

            // Thứ tự resource quyết định thứ tự mục trong thanh điều hướng của bản gốc.
            foreach ([
                'accounts' => SuperAdminAccountsController::class,
                'users' => SuperAdminUsersController::class,
                'access_tokens' => SuperAdminAccessTokensController::class,
                'installation_configs' => SuperAdminInstallationConfigsController::class,
                'agent_bots' => SuperAdminAgentBotsController::class,
                'platform_apps' => SuperAdminPlatformAppsController::class,
            ] as $resource => $controller) {
                Route::get("/{$resource}", [$controller, 'index']);
                Route::get("/{$resource}/new", [$controller, 'create']);
                Route::post("/{$resource}", [$controller, 'store']);
                Route::get("/{$resource}/{id}", [$controller, 'show'])->whereNumber('id');
                Route::get("/{$resource}/{id}/edit", [$controller, 'edit'])->whereNumber('id');
                Route::match(['put', 'patch'], "/{$resource}/{id}", [$controller, 'update'])->whereNumber('id');
                Route::delete("/{$resource}/{id}", [$controller, 'destroy'])->whereNumber('id');
            }
        });
    });
});

// Đăng nhập bằng link một lần (Platform API users#login, impersonate của console).
// F7 Super Admin — END
