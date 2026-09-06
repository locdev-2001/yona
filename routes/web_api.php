<?php

use App\Http\Controllers\WebApi\AccountsController;
use App\Http\Controllers\WebApi\Actions\ContactMergesController;
use App\Http\Controllers\WebApi\AgentBotsController;
use App\Http\Controllers\WebApi\AgentsController;
use App\Http\Controllers\WebApi\AutomationRulesController;
use App\Http\Controllers\WebApi\BulkActionsController;
use App\Http\Controllers\WebApi\CampaignsController;
use App\Http\Controllers\WebApi\CannedResponsesController;
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
use App\Http\Controllers\WebApi\InboxesController;
use App\Http\Controllers\WebApi\InboxMembersController;
use App\Http\Controllers\WebApi\Integrations\AppsController as IntegrationAppsController;
use App\Http\Controllers\WebApi\LabelsController;
use App\Http\Controllers\WebApi\MacrosController;
use App\Http\Controllers\WebApi\NotificationsController;
use App\Http\Controllers\WebApi\NotificationSettingsController;
use App\Http\Controllers\WebApi\PresenceController;
use App\Http\Controllers\WebApi\ProfileAvailabilityController;
use App\Http\Controllers\WebApi\ProfilesController;
use App\Http\Controllers\WebApi\Reports\LiveReportsController;
use App\Http\Controllers\WebApi\Reports\ReportsController;
use App\Http\Controllers\WebApi\Reports\SummaryReportsController;
use App\Http\Controllers\WebApi\TeamMembersController;
use App\Http\Controllers\WebApi\TeamsController;
use App\Http\Controllers\WebApi\UploadController;
use App\Http\Controllers\WebApi\WebhooksController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

// Mặt tiền web_api: JSON cho chính FE (session auth) — map path /api/v1
// như dashboard API của Chatwoot (quyết định #3).

// Profile không gắn account (Chatwoot: /api/v1/profile).
Route::middleware('auth')->prefix('/api/v1')->group(function () {
    Route::get('/profile', [ProfilesController::class, 'show']);
    Route::match(['put', 'patch'], '/profile', [ProfilesController::class, 'update']);
    Route::delete('/profile/avatar', [ProfilesController::class, 'destroyAvatar']);
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
        Route::get('/conversations/meta', [ConversationsController::class, 'meta']);
        Route::get('/conversations/unread_counts', [ConversationsController::class, 'unreadCounts']);
        // {conversationId} là display_id per-account, không phải khóa chính.
        Route::get('/conversations/{conversationId}', [ConversationsController::class, 'show'])->whereNumber('conversationId');
        Route::get('/conversations/{conversationId}/messages', [MessagesController::class, 'index'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/messages', [MessagesController::class, 'store'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/direct_uploads', [DirectUploadsController::class, 'store'])->whereNumber('conversationId');
        Route::match(['put', 'patch'], '/conversations/{conversationId}', [ConversationsController::class, 'update'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/toggle_typing_status', [ConversationsController::class, 'toggleTypingStatus'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/toggle_status', [ConversationsController::class, 'toggleStatus'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/toggle_priority', [ConversationsController::class, 'togglePriority'])->whereNumber('conversationId');
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
