<?php

use Illuminate\Support\Facades\Route;
use Modules\Inbox\Http\Controllers\ConversationLeadController;
use Modules\Inbox\Http\Controllers\InboxController;

/**
 * Inbox web routes — loaded by InboxServiceProvider.
 * Group: web + auth + workspace middleware.
 */
Route::middleware(['auth', 'workspace'])->group(function () {
    // Inbox list
    Route::get('/inbox', [InboxController::class, 'index'])->name('inbox.index');

    // Conversation messages (GET = load, POST = send)
    Route::get('/inbox/conversations/{conversation}/messages', [InboxController::class, 'messages'])
        ->name('inbox.messages');

    Route::post('/inbox/conversations/{conversation}/messages', [InboxController::class, 'send'])
        ->name('inbox.send');

    // Conversation → Lead conversion (idempotent)
    Route::post('/inbox/conversations/{conversation}/lead', [ConversationLeadController::class, 'store'])
        ->name('inbox.lead.store');
});
