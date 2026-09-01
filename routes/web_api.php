<?php

use App\Http\Controllers\WebApi\AgentsController;
use App\Http\Controllers\WebApi\Contacts\ContactInboxesController;
use App\Http\Controllers\WebApi\ContactsController;
use App\Http\Controllers\WebApi\Conversations\MessagesController;
use App\Http\Controllers\WebApi\ConversationsController;
use App\Http\Controllers\WebApi\InboxesController;
use App\Http\Controllers\WebApi\InboxMembersController;
use App\Http\Controllers\WebApi\ProfileAvailabilityController;
use App\Http\Controllers\WebApi\ProfilesController;
use App\Http\Controllers\WebApi\TeamMembersController;
use App\Http\Controllers\WebApi\TeamsController;
use Illuminate\Support\Facades\Route;

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

        Route::get('/conversations', [ConversationsController::class, 'index']);
        Route::post('/conversations', [ConversationsController::class, 'store']);
        Route::get('/conversations/meta', [ConversationsController::class, 'meta']);
        // {conversationId} là display_id per-account, không phải khóa chính.
        Route::get('/conversations/{conversationId}', [ConversationsController::class, 'show'])->whereNumber('conversationId');
        Route::get('/conversations/{conversationId}/messages', [MessagesController::class, 'index'])->whereNumber('conversationId');
        Route::post('/conversations/{conversationId}/messages', [MessagesController::class, 'store'])->whereNumber('conversationId');

        Route::get('/teams/{teamId}/team_members', [TeamMembersController::class, 'index'])->whereNumber('teamId');
        Route::post('/teams/{teamId}/team_members', [TeamMembersController::class, 'store'])->whereNumber('teamId');
        Route::match(['put', 'patch'], '/teams/{teamId}/team_members', [TeamMembersController::class, 'update'])->whereNumber('teamId');
        Route::delete('/teams/{teamId}/team_members', [TeamMembersController::class, 'destroy'])->whereNumber('teamId');
    });
