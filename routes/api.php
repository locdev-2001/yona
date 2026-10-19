<?php

use App\Http\Controllers\Api\Webhooks\FacebookController as FacebookWebhooksController;
use App\Http\Controllers\Api\Webhooks\GmailPushController;
use App\Http\Controllers\Api\Webhooks\InstagramController as InstagramWebhooksController;
use App\Http\Controllers\Api\Webhooks\LineController as LineWebhooksController;
use App\Http\Controllers\Api\Webhooks\SmsController as SmsWebhooksController;
use App\Http\Controllers\Api\Webhooks\TelegramController as TelegramWebhooksController;
use App\Http\Controllers\Api\Webhooks\TiktokController as TiktokWebhooksController;
use App\Http\Controllers\Api\Webhooks\TwilioController as TwilioWebhooksController;
use App\Http\Controllers\Api\Webhooks\TwitterController as TwitterWebhooksController;
use App\Http\Controllers\Api\Webhooks\WhatsappController as WhatsappWebhooksController;
use App\Http\Controllers\Api\Webhooks\ZaloController as ZaloWebhooksController;
use App\Http\Controllers\Platform\Api\V1\AccountsController as PlatformAccountsController;
use App\Http\Controllers\Platform\Api\V1\AccountUsersController as PlatformAccountUsersController;
use App\Http\Controllers\Platform\Api\V1\AgentBotsController as PlatformAgentBotsController;
use App\Http\Controllers\Platform\Api\V1\UsersController as PlatformUsersController;
use App\Http\Controllers\Public\AnalyticsProxyController;
use App\Http\Controllers\RequestSigningKeysController;
use App\Http\Controllers\Widget\BroadcastingAuthController;
use App\Http\Controllers\Widget\CampaignsController;
use App\Http\Controllers\Widget\ConfigsController;
use App\Http\Controllers\Widget\ContactsController;
use App\Http\Controllers\Widget\ConversationsController;
use App\Http\Controllers\Widget\DirectUploadsController;
use App\Http\Controllers\Widget\EventsController;
use App\Http\Controllers\Widget\InboxMembersController;
use App\Http\Controllers\Widget\LabelsController;
use App\Http\Controllers\Widget\MessagesController;
use App\Http\Controllers\Widget\PresenceController;
use App\Http\Controllers\Widget\ReactionsController;
use App\Http\Controllers\Widget\UpdatesController;
use App\Http\Middleware\AuthenticatePlatformApp;
use App\Http\Middleware\EnsureWidgetContact;
use App\Http\Middleware\ResolveOrCreateWidgetContact;
use App\Http\Middleware\ResolveWidgetChannel;
use App\Http\Middleware\VerifyZaloBridgeSecret;
use App\Http\RateLimiting\MessagingRateLimiters;
use App\Http\RequestSigning\ProtectedRoutes;
use Illuminate\Support\Facades\Route;

// Mặt tiền api: API cho BÊN NGOÀI gọi vào, xác thực bằng token, hợp đồng công
// khai (docs/code-standards.md §0.4). Widget website nhúng trên tên miền khách
// hàng là người dùng đầu tiên của mặt tiền này — không session, không CSRF.
//
Route::middleware(ResolveWidgetChannel::class)
    ->prefix('/api/v1/widget')
    ->group(function () {
        // config KHÔNG ghi DB (xem ConfigsController); inbox_members + campaigns
        // không cần khách; events tự quyết định theo loại sự kiện (xem EventsController).
        Route::post('/config', [ConfigsController::class, 'store']);
        Route::get('/inbox_members', [InboxMembersController::class, 'index']);
        Route::get('/campaigns', [CampaignsController::class, 'index']);
        Route::get('/updates', [UpdatesController::class, 'index']);
        Route::get('/updates/{updateId}', [UpdatesController::class, 'show'])->whereNumber('updateId');
        Route::post('/events', [EventsController::class, 'store']);
        // Tab Tin nhắn: khách mới (chưa nhắn tin nào, chưa có contact) thấy danh sách rỗng, không 404.
        Route::get('/conversations/list', [ConversationsController::class, 'list']);
        Route::post('/request_signing_key', [RequestSigningKeysController::class, 'store'])->defaults('surface', 'widget');

        // Hành động THẬT đầu tiên của khách — dựng contact_inbox lazy nếu chưa có.
        Route::middleware(ResolveOrCreateWidgetContact::class)->group(function () {
            // Nhắn tin: ký + mã hoá + giới hạn nhịp theo khách (docs/system-architecture.md §10).
            Route::middleware([ProtectedRoutes::middlewareFor('widget'), 'throttle:'.MessagingRateLimiters::WIDGET_WRITES])->group(function () {
                Route::post('/messages', [MessagesController::class, 'store']);
                Route::post('/conversations', [ConversationsController::class, 'store']);
            });
            Route::match(['put', 'patch'], '/contact', [ContactsController::class, 'update']);
            Route::match(['put', 'patch'], '/contact/set_user', [ContactsController::class, 'setUser']);
        });

        Route::middleware(EnsureWidgetContact::class)->group(function () {
            Route::post('/direct_uploads', [DirectUploadsController::class, 'store'])->middleware('throttle:'.MessagingRateLimiters::WIDGET_WRITES);
            Route::post('/broadcasting/auth', [BroadcastingAuthController::class, 'authenticate']);
            Route::post('/presence', [PresenceController::class, 'update']);

            Route::get('/messages', [MessagesController::class, 'index'])
                ->middleware([ProtectedRoutes::middlewareFor('widget'), 'throttle:'.MessagingRateLimiters::WIDGET_READS]);
            Route::middleware([ProtectedRoutes::middlewareFor('widget'), 'throttle:'.MessagingRateLimiters::WIDGET_WRITES])->group(function () {
                Route::match(['put', 'patch'], '/messages/{messageId}', [MessagesController::class, 'update'])->whereNumber('messageId');
                Route::delete('/messages/{messageId}', [MessagesController::class, 'destroy'])->whereNumber('messageId');
                Route::post('/messages/{messageId}/reactions', [ReactionsController::class, 'store'])->whereNumber('messageId');
                Route::delete('/messages/{messageId}/reactions', [ReactionsController::class, 'destroy'])->whereNumber('messageId');
            });

            Route::get('/conversations', [ConversationsController::class, 'index']);
            Route::post('/conversations/destroy_custom_attributes', [ConversationsController::class, 'destroyCustomAttributes']);
            Route::post('/conversations/set_custom_attributes', [ConversationsController::class, 'setCustomAttributes']);
            Route::post('/conversations/update_last_seen', [ConversationsController::class, 'updateLastSeen']);
            Route::post('/conversations/toggle_typing', [ConversationsController::class, 'toggleTyping']);
            Route::post('/conversations/transcript', [ConversationsController::class, 'transcript']);
            Route::get('/conversations/toggle_status', [ConversationsController::class, 'toggleStatus']);

            Route::get('/contact', [ContactsController::class, 'show']);
            Route::post('/contact/destroy_custom_attributes', [ContactsController::class, 'destroyCustomAttributes']);

            Route::post('/labels', [LabelsController::class, 'store']);
            Route::delete('/labels/{label}', [LabelsController::class, 'destroy']);
        });
    });

// F7 Platform API (/platform/api/v1/*) — BEGIN (agent f7 sở hữu khối này)
// Platform API: xác thực bằng header api_access_token của một PlatformApp, không session/CSRF.
// Không mã hoá (đối tác gọi server-to-server), chỉ giới hạn nhịp theo PlatformApp.
Route::middleware([AuthenticatePlatformApp::class, 'throttle:'.MessagingRateLimiters::PLATFORM_API])
    ->prefix('/platform/api/v1')
    ->group(function () {
        Route::get('/users/{user}/login', [PlatformUsersController::class, 'login'])->whereNumber('user');
        Route::post('/users/{user}/token', [PlatformUsersController::class, 'token'])->whereNumber('user');
        Route::post('/users', [PlatformUsersController::class, 'store']);
        Route::get('/users/{user}', [PlatformUsersController::class, 'show'])->whereNumber('user');
        Route::match(['put', 'patch'], '/users/{user}', [PlatformUsersController::class, 'update'])->whereNumber('user');
        Route::delete('/users/{user}', [PlatformUsersController::class, 'destroy'])->whereNumber('user');

        Route::get('/agent_bots', [PlatformAgentBotsController::class, 'index']);
        Route::post('/agent_bots', [PlatformAgentBotsController::class, 'store']);
        Route::get('/agent_bots/{agentBot}', [PlatformAgentBotsController::class, 'show'])->whereNumber('agentBot');
        Route::match(['put', 'patch'], '/agent_bots/{agentBot}', [PlatformAgentBotsController::class, 'update'])->whereNumber('agentBot');
        Route::delete('/agent_bots/{agentBot}', [PlatformAgentBotsController::class, 'destroy'])->whereNumber('agentBot');
        Route::delete('/agent_bots/{agentBot}/avatar', [PlatformAgentBotsController::class, 'destroyAvatar'])->whereNumber('agentBot');

        Route::get('/accounts', [PlatformAccountsController::class, 'index']);
        Route::post('/accounts', [PlatformAccountsController::class, 'store']);
        Route::get('/accounts/{account}', [PlatformAccountsController::class, 'show'])->whereNumber('account');
        Route::match(['put', 'patch'], '/accounts/{account}', [PlatformAccountsController::class, 'update'])->whereNumber('account');
        Route::delete('/accounts/{account}', [PlatformAccountsController::class, 'destroy'])->whereNumber('account');

        Route::get('/accounts/{account}/account_users', [PlatformAccountUsersController::class, 'index'])->whereNumber('account');
        Route::post('/accounts/{account}/account_users', [PlatformAccountUsersController::class, 'store'])->whereNumber('account');
        Route::delete('/accounts/{account}/account_users', [PlatformAccountUsersController::class, 'destroy'])->whereNumber('account');
    });
// F7 Platform API — END

// F2-F5 webhook nhận từ kênh ngoài (/webhooks/*) — BEGIN (agent f2f5-be sở hữu khối này)
// Webhook nhà cung cấp. Không session, không CSRF: mỗi kênh
// tự xác thực theo cách của nhà cung cấp (token trong URL, HMAC header, chữ ký Twilio).
Route::get('/bot', [FacebookWebhooksController::class, 'verify']);
Route::post('/bot', [FacebookWebhooksController::class, 'events']);

Route::get('/webhooks/twitter', [TwitterWebhooksController::class, 'crc']);
Route::post('/webhooks/twitter', [TwitterWebhooksController::class, 'events']);
Route::post('/webhooks/line/{lineChannelId}', [LineWebhooksController::class, 'processPayload']);
Route::post('/webhooks/telegram/{botToken}', [TelegramWebhooksController::class, 'processPayload']);
Route::post('/webhooks/sms/{phoneNumber}', [SmsWebhooksController::class, 'processPayload']);
Route::get('/webhooks/whatsapp/{phoneNumber}', [WhatsappWebhooksController::class, 'verify']);
Route::post('/webhooks/whatsapp/{phoneNumber}', [WhatsappWebhooksController::class, 'processPayload']);
Route::get('/webhooks/instagram', [InstagramWebhooksController::class, 'verify']);
Route::post('/webhooks/instagram', [InstagramWebhooksController::class, 'events']);
Route::post('/webhooks/tiktok', [TiktokWebhooksController::class, 'events']);
// Gmail push qua Pub/Sub: xác thực bằng OIDC token của service account trong header;
// giới hạn theo IP để token rác không biến thành tải dồn lên máy chủ.
Route::post('/webhooks/gmail/push', GmailPushController::class)->middleware('throttle:120,1');
Route::post('/twilio/callback', [TwilioWebhooksController::class, 'processPayload']);
Route::post('/twilio/delivery_status', [TwilioWebhooksController::class, 'deliveryStatus'])->name('twilio.delivery_status');
// F2-F5 webhooks — END

// G1 Zalo cá nhân webhook từ zalo-bridge — BEGIN (agent g1 sở hữu khối này)
// Bridge Node (services/zalo-bridge) đẩy tin đến, trạng thái phiên và sự kiện
// trạng-thái-tin về đây; xác thực bằng secret dùng chung trên header.
Route::post('/webhooks/zalo', ZaloWebhooksController::class)
    ->middleware(VerifyZaloBridgeSecret::class);
// G1 Zalo webhook — END

// Analytics first-party: script và sự kiện đi qua chính domain app để trình chặn quảng
// cáo không chặn theo domain/mẫu URL của nhà cung cấp. Nhóm `api`: không session, không
// cookie, không CSRF. Không đuôi .js: rule tĩnh của nginx aaPanel sẽ nuốt URL đó
// (docs/deployment.md mục 7).
Route::prefix(config('services.plausible.proxy_path'))->group(function () {
    Route::get('/s', [AnalyticsProxyController::class, 'script'])->name('analytics.script');
    Route::post('/e', [AnalyticsProxyController::class, 'event'])
        ->middleware('throttle:analytics-proxy')
        ->name('analytics.event');
});
