<?php

use App\Http\Controllers\WebApi\AgentsController;
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

Route::middleware(['auth', 'account.scope'])
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

        Route::get('/teams/{teamId}/team_members', [TeamMembersController::class, 'index'])->whereNumber('teamId');
        Route::post('/teams/{teamId}/team_members', [TeamMembersController::class, 'store'])->whereNumber('teamId');
        Route::match(['put', 'patch'], '/teams/{teamId}/team_members', [TeamMembersController::class, 'update'])->whereNumber('teamId');
        Route::delete('/teams/{teamId}/team_members', [TeamMembersController::class, 'destroy'])->whereNumber('teamId');
    });
