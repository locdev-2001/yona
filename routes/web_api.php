<?php

use App\Http\Controllers\Api\Integrations\WebhooksController as SlackEventsWebhooksController;
use App\Http\Controllers\WebApi\AccountsController;
use App\Http\Controllers\WebApi\Actions\ContactMergesController;
use App\Http\Controllers\WebApi\AgentBotsController;
use App\Http\Controllers\WebApi\AgentsController;
use App\Http\Controllers\WebApi\Articles\BulkActionsController as ArticleBulkActionsController;
use App\Http\Controllers\WebApi\ArticlesController;
use App\Http\Controllers\WebApi\AutomationRulesController;
use App\Http\Controllers\WebApi\BulkActionsController;
use App\Http\Controllers\WebApi\CallbacksController;
use App\Http\Controllers\WebApi\CampaignsController;
use App\Http\Controllers\WebApi\CannedResponsesController;
use App\Http\Controllers\WebApi\CategoriesController;
use App\Http\Controllers\WebApi\Contacts\ContactInboxesController;
use App\Http\Controllers\WebApi\Contacts\ConversationsController as ContactConversationsController;
use App\Http\Controllers\WebApi\Contacts\LabelsController as ContactLabelsController;
use App\Http\Controllers\WebApi\Contacts\NotesController as ContactNotesController;
use App\Http\Controllers\WebApi\ContactsController;
use App\Http\Controllers\WebApi\Conversations\AssignmentsController;
use App\Http\Controllers\WebApi\Conversations\DirectUploadsController;
use App\Http\Controllers\WebApi\Conversations\DraftMessagesController;
use App\Http\Controllers\WebApi\Conversations\LabelsController as ConversationLabelsController;
use App\Http\Controllers\WebApi\Conversations\MessagesController;
use App\Http\Controllers\WebApi\Conversations\ParticipantsController;
use App\Http\Controllers\WebApi\ConversationsController;
use App\Http\Controllers\WebApi\CsatSurveyResponsesController;
use App\Http\Controllers\WebApi\CustomAttributeDefinitionsController;
use App\Http\Controllers\WebApi\CustomFiltersController;
use App\Http\Controllers\WebApi\DashboardAppsController;
use App\Http\Controllers\WebApi\DataImportsController;
use App\Http\Controllers\WebApi\InboxesController;
use App\Http\Controllers\WebApi\InboxMembersController;
use App\Http\Controllers\WebApi\Integrations\AppsController as IntegrationAppsController;
use App\Http\Controllers\WebApi\Integrations\DyteController as IntegrationDyteController;
use App\Http\Controllers\WebApi\Integrations\HooksController as IntegrationHooksController;
use App\Http\Controllers\WebApi\Integrations\SlackController as IntegrationSlackController;
use App\Http\Controllers\WebApi\LabelsController;
use App\Http\Controllers\WebApi\MacrosController;
use App\Http\Controllers\WebApi\NotificationsController;
use App\Http\Controllers\WebApi\NotificationSettingsController;
use App\Http\Controllers\WebApi\NotificationSubscriptionsController;
use App\Http\Controllers\WebApi\PortalsController;
use App\Http\Controllers\WebApi\PresenceController;
use App\Http\Controllers\WebApi\Profile\MfaController;
use App\Http\Controllers\WebApi\Profile\SessionsController as ProfileSessionsController;
use App\Http\Controllers\WebApi\ProfileAvailabilityController;
use App\Http\Controllers\WebApi\ProfilesController;
use App\Http\Controllers\WebApi\Reports\LiveReportsController;
use App\Http\Controllers\WebApi\Reports\ReportsController;
use App\Http\Controllers\WebApi\Reports\SummaryReportsController;
use App\Http\Controllers\WebApi\SearchController;
use App\Http\Controllers\WebApi\TeamMembersController;
use App\Http\Controllers\WebApi\TeamsController;
use App\Http\Controllers\WebApi\UploadController;
use App\Http\Controllers\WebApi\WebhooksController;
use App\Http\Controllers\WebApi\ZaloConnectionsController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

// Mặt tiền web_api: JSON cho chính FE (session auth) — map path /api/v1
// như dashboard API của Chatwoot (quyết định #3).

// Profile không gắn account (Chatwoot: /api/v1/profile).
Route::middleware('auth')->prefix('/api/v1')->group(function () {
    Route::get('/profile', [ProfilesController::class, 'show']);
    Route::match(['put', 'patch'], '/profile', [ProfilesController::class, 'update']);
    Route::delete('/profile/avatar', [ProfilesController::class, 'destroyAvatar']);

    // F8 MFA + user sessions — BEGIN (agent f8 sở hữu khối này)
    // profile/mfa_controller.rb + profile/sessions_controller.rb: không gắn account.
    Route::get('/profile/mfa', [MfaController::class, 'show']);
    Route::post('/profile/mfa', [MfaController::class, 'store']);
    Route::delete('/profile/mfa', [MfaController::class, 'destroy']);
    Route::post('/profile/mfa/verify', [MfaController::class, 'verify']);
    Route::post('/profile/mfa/backup_codes', [MfaController::class, 'backupCodes']);
    Route::get('/profile/sessions', [ProfileSessionsController::class, 'index']);
    Route::delete('/profile/sessions/{id}', [ProfileSessionsController::class, 'destroy'])->whereNumber('id');
    // F8 MFA + user sessions — END
});

// resource :notification_subscriptions (số ít, không gắn account). Nhận cả phiên
// lẫn header api_access_token như Api::BaseController của bản gốc.
Route::middleware(['auth.api_token', 'auth'])->prefix('/api/v1')->group(function () {
    Route::post('/notification_subscriptions', [NotificationSubscriptionsController::class, 'store']);
    Route::delete('/notification_subscriptions', [NotificationSubscriptionsController::class, 'destroy']);
});

// auth.api_token đứng trước auth: header api_access_token (Application API,
// curl/bot) thế chỗ session — cùng endpoint như Chatwoot.
Route::middleware(['auth.api_token', 'auth', 'account.scope'])
    ->prefix('/api/v1/accounts/{account}')
    ->whereNumber('account')
    ->group(function () {
        Route::post('/profile/availability', [ProfileAvailabilityController::class, 'availability']);
        Route::post('/profile/auto_offline', [ProfileAvailabilityController::class, 'autoOffline']);
        Route::post('/presence', [PresenceController::class, 'update']);

        Route::get('/', [AccountsController::class, 'show']);
        Route::match(['put', 'patch'], '/', [AccountsController::class, 'update']);

        Route::get('/agents', [AgentsController::class, 'index']);
        Route::post('/agents', [AgentsController::class, 'store']);
        Route::post('/agents/bulk_create', [AgentsController::class, 'bulkCreate']);
        Route::match(['put', 'patch'], '/agents/{agentId}', [AgentsController::class, 'update'])->whereNumber('agentId');
        Route::delete('/agents/{agentId}', [AgentsController::class, 'destroy'])->whereNumber('agentId');

        Route::get('/teams', [TeamsController::class, 'index']);
        Route::post('/teams', [TeamsController::class, 'store']);
        Route::get('/teams/{teamId}', [TeamsController::class, 'show'])->whereNumber('teamId');
        Route::match(['put', 'patch'], '/teams/{teamId}', [TeamsController::class, 'update'])->whereNumber('teamId');
        Route::delete('/teams/{teamId}', [TeamsController::class, 'destroy'])->whereNumber('teamId');

        Route::get('/inboxes', [InboxesController::class, 'index']);
        Route::post('/inboxes', [InboxesController::class, 'store']);
        Route::get('/inboxes/{inboxId}', [InboxesController::class, 'show'])->whereNumber('inboxId');
        Route::match(['put', 'patch'], '/inboxes/{inboxId}', [InboxesController::class, 'update'])->whereNumber('inboxId');
        Route::delete('/inboxes/{inboxId}', [InboxesController::class, 'destroy'])->whereNumber('inboxId');
        Route::get('/assignable_agents', [InboxesController::class, 'assignableAgentsForInboxes']);
        Route::get('/inboxes/{inboxId}/assignable_agents', [InboxesController::class, 'assignableAgents'])->whereNumber('inboxId');
        Route::post('/inboxes/{inboxId}/reset_secret', [InboxesController::class, 'resetSecret'])->whereNumber('inboxId');
        Route::delete('/inboxes/{inboxId}/avatar', [InboxesController::class, 'destroyAvatar'])->whereNumber('inboxId');

        // inbox_members: show theo /:inbox_id, create/update/destroy trên collection
        // với inbox_id trong body — đúng route Chatwoot.
        Route::get('/inbox_members/{inboxId}', [InboxMembersController::class, 'show'])->whereNumber('inboxId');
        Route::post('/inbox_members', [InboxMembersController::class, 'store']);
        Route::match(['put', 'patch'], '/inbox_members', [InboxMembersController::class, 'update']);
        Route::delete('/inbox_members', [InboxMembersController::class, 'destroy']);

        Route::get('/contacts', [ContactsController::class, 'index']);
        Route::post('/contacts', [ContactsController::class, 'store']);
        Route::get('/contacts/search', [ContactsController::class, 'search']);
        Route::get('/contacts/active', [ContactsController::class, 'active']);
        Route::get('/contacts/{contactId}', [ContactsController::class, 'show'])->whereNumber('contactId');
        Route::match(['put', 'patch'], '/contacts/{contactId}', [ContactsController::class, 'update'])->whereNumber('contactId');
        Route::delete('/contacts/{contactId}', [ContactsController::class, 'destroy'])->whereNumber('contactId');
        Route::post('/contacts/{contactId}/destroy_custom_attributes', [ContactsController::class, 'destroyCustomAttributes'])->whereNumber('contactId');
        Route::delete('/contacts/{contactId}/avatar', [ContactsController::class, 'destroyAvatar'])->whereNumber('contactId');
        Route::post('/contacts/{contactId}/contact_inboxes', [ContactInboxesController::class, 'store'])->whereNumber('contactId');
        Route::get('/contacts/{contactId}/notes', [ContactNotesController::class, 'index'])->whereNumber('contactId');
        Route::post('/contacts/{contactId}/notes', [ContactNotesController::class, 'store'])->whereNumber('contactId');
        Route::match(['put', 'patch'], '/contacts/{contactId}/notes/{noteId}', [ContactNotesController::class, 'update'])
            ->whereNumber(['contactId', 'noteId']);
        Route::delete('/contacts/{contactId}/notes/{noteId}', [ContactNotesController::class, 'destroy'])
            ->whereNumber(['contactId', 'noteId']);
        Route::get('/contacts/{contactId}/conversations', [ContactConversationsController::class, 'index'])->whereNumber('contactId');
        Route::get('/conversations/{conversationId}/attachments', [ConversationsController::class, 'attachments'])->whereNumber('conversationId');
        Route::get('/contacts/{contactId}/labels', [ContactLabelsController::class, 'index'])->whereNumber('contactId');
        Route::post('/contacts/{contactId}/labels', [ContactLabelsController::class, 'create'])->whereNumber('contactId');

        Route::get('/conversations', [ConversationsController::class, 'index']);
        Route::post('/conversations', [ConversationsController::class, 'store']);
        Route::post('/conversations/filter', [ConversationsController::class, 'filter']);
        Route::post('/contacts/filter', [ContactsController::class, 'filter']);
        Route::get('/conversations/meta', [ConversationsController::class, 'meta']);
        Route::get('/conversations/unread_counts', [ConversationsController::class, 'unreadCounts']);
        // {conversationId} là display_id per-account, không phải khóa chính.
        Route::get('/conversations/{conversationId}', [ConversationsController::class, 'show'])->whereNumber('conversationId');
        Route::get('/conversations/{conversationId}/messages', [MessagesController::class, 'index'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/messages', [MessagesController::class, 'store'])->whereNumber('conversationId');
        // messages#retry — gửi lại tin thất bại (docs/channel-capabilities.md §2.2 `outbound_retry`).
        Route::post('/conversations/{conversationId}/messages/{messageId}/retry', [MessagesController::class, 'retry'])
            ->whereNumber(['conversationId', 'messageId']);
        // messages#destroy — xoá tin ở Yona; kênh khai `outbound_recall` thì thu hồi
        // luôn ở kênh (docs/channel-capabilities.md §2.2, quyết định Q4 07/09).
        Route::delete('/conversations/{conversationId}/messages/{messageId}', [MessagesController::class, 'destroy'])
            ->whereNumber(['conversationId', 'messageId']);
        // messages#reactions — agent thả/gỡ biểu cảm ra kênh (§2.2 `outbound_reaction`).
        Route::post('/conversations/{conversationId}/messages/{messageId}/reactions', [MessagesController::class, 'storeReaction'])
            ->whereNumber(['conversationId', 'messageId']);
        Route::delete('/conversations/{conversationId}/messages/{messageId}/reactions', [MessagesController::class, 'destroyReaction'])
            ->whereNumber(['conversationId', 'messageId']);
        Route::post('/conversations/{conversationId}/direct_uploads', [DirectUploadsController::class, 'store'])->whereNumber('conversationId');
        Route::match(['put', 'patch'], '/conversations/{conversationId}', [ConversationsController::class, 'update'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/toggle_typing_status', [ConversationsController::class, 'toggleTypingStatus'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/toggle_status', [ConversationsController::class, 'toggleStatus'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/toggle_priority', [ConversationsController::class, 'togglePriority'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/custom_attributes', [ConversationsController::class, 'customAttributes'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/destroy_custom_attributes', [ConversationsController::class, 'destroyCustomAttributes'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/update_last_seen', [ConversationsController::class, 'updateLastSeen'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/unread', [ConversationsController::class, 'unread'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/assignments', [AssignmentsController::class, 'create'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/mute', [ConversationsController::class, 'mute'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/unmute', [ConversationsController::class, 'unmute'])->whereNumber('conversationId');
        // resource :participants (singular) — user_ids nằm trong body.
        Route::get('/conversations/{conversationId}/participants', [ParticipantsController::class, 'show'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/participants', [ParticipantsController::class, 'store'])->whereNumber('conversationId');
        Route::match(['put', 'patch'], '/conversations/{conversationId}/participants', [ParticipantsController::class, 'update'])->whereNumber('conversationId');
        Route::delete('/conversations/{conversationId}/participants', [ParticipantsController::class, 'destroy'])->whereNumber('conversationId');
        Route::get('/conversations/{conversationId}/labels', [ConversationLabelsController::class, 'index'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/labels', [ConversationLabelsController::class, 'create'])->whereNumber('conversationId');
        // resource :draft_messages (singular) — mot ban nhap moi conversation.
        Route::get('/conversations/{conversationId}/draft_messages', [DraftMessagesController::class, 'show'])->whereNumber('conversationId');
        Route::match(['put', 'patch'], '/conversations/{conversationId}/draft_messages', [DraftMessagesController::class, 'update'])->whereNumber('conversationId');
        Route::delete('/conversations/{conversationId}/draft_messages', [DraftMessagesController::class, 'destroy'])->whereNumber('conversationId');

        // resources :notifications + resource :notification_settings (số ít).
        Route::get('/notifications', [NotificationsController::class, 'index']);
        Route::get('/notifications/unread_count', [NotificationsController::class, 'unreadCount']);
        Route::post('/notifications/read_all', [NotificationsController::class, 'readAll']);
        Route::post('/notifications/destroy_all', [NotificationsController::class, 'destroyAll']);
        Route::post('/notifications/{notificationId}/snooze', [NotificationsController::class, 'snooze'])->whereNumber('notificationId');
        Route::post('/notifications/{notificationId}/unread', [NotificationsController::class, 'unread'])->whereNumber('notificationId');
        Route::match(['put', 'patch'], '/notifications/{notificationId}', [NotificationsController::class, 'update'])->whereNumber('notificationId');
        Route::delete('/notifications/{notificationId}', [NotificationsController::class, 'destroy'])->whereNumber('notificationId');

        Route::get('/notification_settings', [NotificationSettingsController::class, 'show']);
        Route::match(['put', 'patch'], '/notification_settings', [NotificationSettingsController::class, 'update']);

        Route::get('/labels', [LabelsController::class, 'index']);
        Route::post('/labels', [LabelsController::class, 'store']);
        Route::get('/labels/{labelId}', [LabelsController::class, 'show'])->whereNumber('labelId');
        Route::match(['put', 'patch'], '/labels/{labelId}', [LabelsController::class, 'update'])->whereNumber('labelId');
        Route::delete('/labels/{labelId}', [LabelsController::class, 'destroy'])->whereNumber('labelId');

        Route::get('/canned_responses', [CannedResponsesController::class, 'index']);
        Route::post('/canned_responses', [CannedResponsesController::class, 'store']);
        Route::match(['put', 'patch'], '/canned_responses/{cannedResponseId}', [CannedResponsesController::class, 'update'])->whereNumber('cannedResponseId');
        Route::delete('/canned_responses/{cannedResponseId}', [CannedResponsesController::class, 'destroy'])->whereNumber('cannedResponseId');

        Route::get('/automation_rules', [AutomationRulesController::class, 'index']);
        Route::post('/automation_rules', [AutomationRulesController::class, 'store']);
        Route::get('/automation_rules/{automationRuleId}', [AutomationRulesController::class, 'show'])->whereNumber('automationRuleId');
        Route::match(['put', 'patch'], '/automation_rules/{automationRuleId}', [AutomationRulesController::class, 'update'])->whereNumber('automationRuleId');
        Route::delete('/automation_rules/{automationRuleId}', [AutomationRulesController::class, 'destroy'])->whereNumber('automationRuleId');
        Route::post('/automation_rules/{automationRuleId}/clone', [AutomationRulesController::class, 'clone'])->whereNumber('automationRuleId');

        // E4 Help Center (portals/categories/articles controller gốc).
        Route::get('/portals', [PortalsController::class, 'index']);
        Route::post('/portals', [PortalsController::class, 'store']);
        Route::get('/portals/{slug}', [PortalsController::class, 'show']);
        Route::match(['put', 'patch'], '/portals/{slug}', [PortalsController::class, 'update']);
        Route::delete('/portals/{slug}', [PortalsController::class, 'destroy']);
        Route::patch('/portals/{slug}/archive', [PortalsController::class, 'archive']);
        Route::delete('/portals/{slug}/logo', [PortalsController::class, 'destroyLogo']);
        Route::post('/portals/{slug}/send_instructions', [PortalsController::class, 'sendInstructions']);

        Route::get('/portals/{portalSlug}/categories', [CategoriesController::class, 'index']);
        Route::post('/portals/{portalSlug}/categories', [CategoriesController::class, 'store']);
        Route::post('/portals/{portalSlug}/categories/reorder', [CategoriesController::class, 'reorder']);
        Route::get('/portals/{portalSlug}/categories/{categoryId}', [CategoriesController::class, 'show'])->whereNumber('categoryId');
        Route::match(['put', 'patch'], '/portals/{portalSlug}/categories/{categoryId}', [CategoriesController::class, 'update'])
            ->whereNumber('categoryId');
        Route::delete('/portals/{portalSlug}/categories/{categoryId}', [CategoriesController::class, 'destroy'])->whereNumber('categoryId');

        Route::post('/portals/{portalSlug}/articles/bulk_actions/translate', [ArticleBulkActionsController::class, 'translate']);
        Route::patch('/portals/{portalSlug}/articles/bulk_actions/update_status', [ArticleBulkActionsController::class, 'updateStatus']);
        Route::patch('/portals/{portalSlug}/articles/bulk_actions/update_category', [ArticleBulkActionsController::class, 'updateCategory']);
        Route::delete('/portals/{portalSlug}/articles/bulk_actions/delete_articles', [ArticleBulkActionsController::class, 'deleteArticles']);

        Route::get('/portals/{portalSlug}/articles', [ArticlesController::class, 'index']);
        Route::post('/portals/{portalSlug}/articles', [ArticlesController::class, 'store']);
        Route::post('/portals/{portalSlug}/articles/reorder', [ArticlesController::class, 'reorder']);
        Route::get('/portals/{portalSlug}/articles/{articleId}', [ArticlesController::class, 'show'])->whereNumber('articleId');
        Route::get('/portals/{portalSlug}/articles/{articleId}/edit', [ArticlesController::class, 'edit'])->whereNumber('articleId');
        Route::match(['put', 'patch'], '/portals/{portalSlug}/articles/{articleId}', [ArticlesController::class, 'update'])
            ->whereNumber('articleId');
        Route::delete('/portals/{portalSlug}/articles/{articleId}', [ArticlesController::class, 'destroy'])->whereNumber('articleId');

        // E1 custom_attribute_definitions + custom_filters (segments/folders).
        Route::get('/custom_attribute_definitions', [CustomAttributeDefinitionsController::class, 'index']);
        Route::post('/custom_attribute_definitions', [CustomAttributeDefinitionsController::class, 'store']);
        Route::get('/custom_attribute_definitions/{definitionId}', [CustomAttributeDefinitionsController::class, 'show'])->whereNumber('definitionId');
        Route::match(['put', 'patch'], '/custom_attribute_definitions/{definitionId}', [CustomAttributeDefinitionsController::class, 'update'])->whereNumber('definitionId');
        Route::delete('/custom_attribute_definitions/{definitionId}', [CustomAttributeDefinitionsController::class, 'destroy'])->whereNumber('definitionId');

        Route::get('/custom_filters', [CustomFiltersController::class, 'index']);
        Route::post('/custom_filters', [CustomFiltersController::class, 'store']);
        Route::get('/custom_filters/{customFilterId}', [CustomFiltersController::class, 'show'])->whereNumber('customFilterId');
        Route::match(['put', 'patch'], '/custom_filters/{customFilterId}', [CustomFiltersController::class, 'update'])->whereNumber('customFilterId');
        Route::delete('/custom_filters/{customFilterId}', [CustomFiltersController::class, 'destroy'])->whereNumber('customFilterId');

        // E3 data_imports + contacts export — BEGIN (agent e3-be sở hữu khối này)
        // data_imports_controller.rb — chỉ index/show (nhánh nhập CSV liên hệ).
        Route::get('/data_imports', [DataImportsController::class, 'index']);
        Route::get('/data_imports/{dataImportId}', [DataImportsController::class, 'show'])->whereNumber('dataImportId');
        // contacts_controller.rb#import / #export
        Route::post('/contacts/import', [ContactsController::class, 'import']);
        Route::post('/contacts/export', [ContactsController::class, 'export']);
        // contacts/attachments#index — tab Media của sidebar liên hệ (thêm bởi e3-fe).
        Route::get('/contacts/{contactId}/attachments', [ContactsController::class, 'attachments'])->whereNumber('contactId');
        // E3 data_imports + contacts export — END

        // F1 email channel — BEGIN (agent f1-be sở hữu khối này)
        // Kênh Email không có endpoint riêng ở bản gốc: tạo/sửa inbox email đi
        // qua chính `/inboxes` (channel[type] = 'email'), IMAP/SMTP nằm trong
        // khối `channel` của PATCH. Cửa nhận thư đến là ActionMailbox — nằm
        // NGOÀI nhóm route theo account, xem `reports/f1-notes-be.md` mục
        // "Cửa nhận thư đến".
        // F1 email channel — END

        // F8 MFA + user sessions — BEGIN (agent f8 sở hữu khối này)
        // Trống có chủ đích: MFA/phiên đăng nhập là của người dùng, không gắn
        // account — route thật nằm trong nhóm /api/v1 ở đầu file.
        // F8 MFA + user sessions — END

        // F6 integrations hooks + dashboard_apps — BEGIN (agent f6 sở hữu khối này)
        Route::get('/dashboard_apps', [DashboardAppsController::class, 'index']);
        Route::post('/dashboard_apps', [DashboardAppsController::class, 'store']);
        Route::get('/dashboard_apps/{dashboardAppId}', [DashboardAppsController::class, 'show'])->whereNumber('dashboardAppId');
        Route::match(['put', 'patch'], '/dashboard_apps/{dashboardAppId}', [DashboardAppsController::class, 'update'])->whereNumber('dashboardAppId');
        Route::delete('/dashboard_apps/{dashboardAppId}', [DashboardAppsController::class, 'destroy'])->whereNumber('dashboardAppId');

        Route::post('/integrations/hooks', [IntegrationHooksController::class, 'store']);
        Route::match(['put', 'patch'], '/integrations/hooks/{hookId}', [IntegrationHooksController::class, 'update'])->whereNumber('hookId');
        Route::delete('/integrations/hooks/{hookId}', [IntegrationHooksController::class, 'destroy'])->whereNumber('hookId');
        Route::post('/integrations/hooks/{hookId}/process_event', [IntegrationHooksController::class, 'processEvent'])->whereNumber('hookId');

        // resource :slack (số ít) — một hook Slack cho mỗi account.
        Route::post('/integrations/slack', [IntegrationSlackController::class, 'store']);
        Route::match(['put', 'patch'], '/integrations/slack', [IntegrationSlackController::class, 'update']);
        Route::delete('/integrations/slack', [IntegrationSlackController::class, 'destroy']);
        Route::get('/integrations/slack/list_all_channels', [IntegrationSlackController::class, 'listAllChannels']);

        Route::post('/integrations/dyte/create_a_meeting', [IntegrationDyteController::class, 'createAMeeting']);
        Route::post('/integrations/dyte/add_participant_to_meeting', [IntegrationDyteController::class, 'addParticipantToMeeting']);

        // messages#translate — Google Translate.
        Route::post('/conversations/{conversationId}/messages/{messageId}/translate', [MessagesController::class, 'translate'])
            ->whereNumber(['conversationId', 'messageId']);
        // F6 integrations hooks + dashboard_apps — END

        // F2-F5 kênh ngoài (callbacks, register page…) — BEGIN (agent f2f5-be sở hữu khối này)
        // Port từ `resources :callbacks` trong refs/chatwoot/config/routes.rb.
        Route::post('/callbacks/register_facebook_page', [CallbacksController::class, 'registerFacebookPage']);
        Route::get('/callbacks/facebook_pages', [CallbacksController::class, 'facebookPages']);
        Route::post('/callbacks/reauthorize_page/{inboxId}', [CallbacksController::class, 'reauthorizePage'])->whereNumber('inboxId');
        // F2-F5 kênh ngoài — END

        // G1 Zalo cá nhân (QR lifecycle, health) — BEGIN (agent g1 sở hữu khối này)
        Route::post('/inboxes/{inboxId}/zalo/qr', [ZaloConnectionsController::class, 'startQr'])->whereNumber('inboxId');
        Route::get('/inboxes/{inboxId}/zalo/qr_status', [ZaloConnectionsController::class, 'qrStatus'])->whereNumber('inboxId');
        Route::post('/inboxes/{inboxId}/zalo/promote', [ZaloConnectionsController::class, 'promote'])->whereNumber('inboxId');
        Route::post('/inboxes/{inboxId}/zalo/disconnect', [ZaloConnectionsController::class, 'disconnect'])->whereNumber('inboxId');
        Route::get('/inboxes/{inboxId}/zalo/health', [ZaloConnectionsController::class, 'health'])->whereNumber('inboxId');
        // G1 Zalo — END

        // E2 search_controller.rb.
        Route::get('/search', [SearchController::class, 'index']);
        Route::get('/search/conversations', [SearchController::class, 'conversations']);
        Route::get('/search/messages', [SearchController::class, 'messages']);
        Route::get('/search/contacts', [SearchController::class, 'contacts']);
        Route::get('/search/articles', [SearchController::class, 'articles']);

        // D2 báo cáo CSAT (csat_survey_responses_controller.rb).
        Route::get('/csat_survey_responses', [CsatSurveyResponsesController::class, 'index']);
        Route::get('/csat_survey_responses/metrics', [CsatSurveyResponsesController::class, 'metrics']);
        Route::get('/csat_survey_responses/download', [CsatSurveyResponsesController::class, 'download']);

        // D3 Macros (mọi vai trò; visibility personal/global quyết định phạm vi).
        Route::get('/macros', [MacrosController::class, 'index']);
        Route::post('/macros', [MacrosController::class, 'store']);
        Route::get('/macros/{macroId}', [MacrosController::class, 'show'])->whereNumber('macroId');
        Route::match(['put', 'patch'], '/macros/{macroId}', [MacrosController::class, 'update'])->whereNumber('macroId');
        Route::delete('/macros/{macroId}', [MacrosController::class, 'destroy'])->whereNumber('macroId');
        Route::post('/macros/{macroId}/execute', [MacrosController::class, 'execute'])->whereNumber('macroId');

        // upload_controller.rb: tệp đính kèm cho macro builder (blob_id ký).
        Route::post('/upload', [UploadController::class, 'store']);

        // D4 Webhooks + Agent Bots + danh mục ứng dụng tích hợp.
        Route::get('/webhooks', [WebhooksController::class, 'index']);
        Route::post('/webhooks', [WebhooksController::class, 'store']);
        Route::match(['put', 'patch'], '/webhooks/{webhookId}', [WebhooksController::class, 'update'])->whereNumber('webhookId');
        Route::delete('/webhooks/{webhookId}', [WebhooksController::class, 'destroy'])->whereNumber('webhookId');

        Route::get('/agent_bots', [AgentBotsController::class, 'index']);
        Route::post('/agent_bots', [AgentBotsController::class, 'store']);
        Route::get('/agent_bots/{agentBotId}', [AgentBotsController::class, 'show'])->whereNumber('agentBotId');
        Route::match(['put', 'patch'], '/agent_bots/{agentBotId}', [AgentBotsController::class, 'update'])->whereNumber('agentBotId');
        Route::delete('/agent_bots/{agentBotId}', [AgentBotsController::class, 'destroy'])->whereNumber('agentBotId');
        Route::delete('/agent_bots/{agentBotId}/avatar', [AgentBotsController::class, 'destroyAvatar'])->whereNumber('agentBotId');
        Route::post('/agent_bots/{agentBotId}/reset_access_token', [AgentBotsController::class, 'resetAccessToken'])->whereNumber('agentBotId');
        Route::post('/agent_bots/{agentBotId}/reset_secret', [AgentBotsController::class, 'resetSecret'])->whereNumber('agentBotId');

        Route::get('/inboxes/{inboxId}/agent_bot', [InboxesController::class, 'agentBot'])->whereNumber('inboxId');
        Route::post('/inboxes/{inboxId}/set_agent_bot', [InboxesController::class, 'setAgentBot'])->whereNumber('inboxId');

        Route::get('/integrations/apps', [IntegrationAppsController::class, 'index']);
        Route::get('/integrations/apps/{appId}', [IntegrationAppsController::class, 'show'])->where('appId', '[a-z_]+');

        // {campaignId} là display_id per-account, không phải khoá chính.
        Route::get('/campaigns', [CampaignsController::class, 'index']);
        Route::post('/campaigns', [CampaignsController::class, 'store']);
        Route::get('/campaigns/{campaignId}', [CampaignsController::class, 'show'])->whereNumber('campaignId');
        Route::match(['put', 'patch'], '/campaigns/{campaignId}', [CampaignsController::class, 'update'])->whereNumber('campaignId');
        Route::delete('/campaigns/{campaignId}', [CampaignsController::class, 'destroy'])->whereNumber('campaignId');

        Route::post('/actions/contact_merge', [ContactMergesController::class, 'create']);

        Route::post('/bulk_actions', [BulkActionsController::class, 'create']);

        Route::get('/teams/{teamId}/team_members', [TeamMembersController::class, 'index'])->whereNumber('teamId');
        Route::post('/teams/{teamId}/team_members', [TeamMembersController::class, 'store'])->whereNumber('teamId');
        Route::match(['put', 'patch'], '/teams/{teamId}/team_members', [TeamMembersController::class, 'update'])->whereNumber('teamId');
        Route::delete('/teams/{teamId}/team_members', [TeamMembersController::class, 'destroy'])->whereNumber('teamId');
    });

// D2 Reports — mặt tiền /api/v2 của Chatwoot (reports, summary_reports, live_reports).
Route::middleware(['auth.api_token', 'auth', 'account.scope'])
    ->prefix('/api/v2/accounts/{account}')
    ->whereNumber('account')
    ->group(function () {
        Route::get('/reports', [ReportsController::class, 'index']);
        foreach ([
            'summary', 'bot_summary', 'agents', 'inboxes', 'labels', 'teams', 'conversations', 'conversations_summary',
            'conversation_traffic', 'drilldown', 'bot_metrics', 'inbox_label_matrix', 'first_response_time_distribution',
            'outgoing_messages_count',
        ] as $action) {
            Route::get("/reports/{$action}", [ReportsController::class, Str::camel($action)]);
        }
        foreach (['agent', 'team', 'inbox', 'label', 'channel'] as $action) {
            Route::get("/summary_reports/{$action}", [SummaryReportsController::class, $action]);
        }
        Route::get('/live_reports/conversation_metrics', [LiveReportsController::class, 'conversationMetrics']);
        Route::get('/live_reports/grouped_conversation_metrics', [LiveReportsController::class, 'groupedConversationMetrics']);
    });

// F6 Slack events (api/v1/integrations/webhooks#create — Slack gọi vào, KHÔNG auth) — BEGIN (agent f6 sở hữu khối này)
Route::post('/api/v1/integrations/webhooks', [SlackEventsWebhooksController::class, 'store']);
// F6 Slack events — END
