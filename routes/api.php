<?php

use App\Http\Controllers\Widget\BroadcastingAuthController;
use App\Http\Controllers\Widget\ConfigsController;
use App\Http\Controllers\Widget\ContactsController;
use App\Http\Controllers\Widget\ConversationsController;
use App\Http\Controllers\Widget\DirectUploadsController;
use App\Http\Controllers\Widget\EventsController;
use App\Http\Controllers\Widget\InboxMembersController;
use App\Http\Controllers\Widget\LabelsController;
use App\Http\Controllers\Widget\MessagesController;
use App\Http\Controllers\Widget\PresenceController;
use App\Http\Middleware\EnsureWidgetContact;
use App\Http\Middleware\ResolveWidgetChannel;
use Illuminate\Support\Facades\Route;

// Mặt tiền api: API cho BÊN NGOÀI gọi vào, xác thực bằng token, hợp đồng công
// khai (docs/code-standards.md §0.4). Widget website nhúng trên tên miền khách
// hàng là người dùng đầu tiên của mặt tiền này — không session, không CSRF.
//
// Port từ khối `namespace :widget` trong refs/chatwoot/config/routes.rb.
Route::middleware(ResolveWidgetChannel::class)
    ->prefix('/v1/widget')
    ->group(function () {
        // configs tự dựng hồ sơ khách khi chưa có; inbox_members không cần khách
        // (skip_before_action :set_contact của bản gốc).
        Route::post('/config', [ConfigsController::class, 'store']);
        Route::get('/inbox_members', [InboxMembersController::class, 'index']);

        Route::middleware(EnsureWidgetContact::class)->group(function () {
            Route::post('/direct_uploads', [DirectUploadsController::class, 'store']);
            Route::post('/broadcasting/auth', [BroadcastingAuthController::class, 'authenticate']);
            Route::post('/presence', [PresenceController::class, 'update']);

            Route::post('/events', [EventsController::class, 'store']);

            Route::get('/messages', [MessagesController::class, 'index']);
            Route::post('/messages', [MessagesController::class, 'store']);
            Route::match(['put', 'patch'], '/messages/{messageId}', [MessagesController::class, 'update'])->whereNumber('messageId');

            Route::get('/conversations', [ConversationsController::class, 'index']);
            Route::post('/conversations', [ConversationsController::class, 'store']);
            Route::post('/conversations/destroy_custom_attributes', [ConversationsController::class, 'destroyCustomAttributes']);
            Route::post('/conversations/set_custom_attributes', [ConversationsController::class, 'setCustomAttributes']);
            Route::post('/conversations/update_last_seen', [ConversationsController::class, 'updateLastSeen']);
            Route::post('/conversations/toggle_typing', [ConversationsController::class, 'toggleTyping']);
            Route::post('/conversations/transcript', [ConversationsController::class, 'transcript']);
            Route::get('/conversations/toggle_status', [ConversationsController::class, 'toggleStatus']);

            // `resource :contact` (số ít): show/update ở /contact, hai action
            // collection nằm dưới cùng đoạn đường đó.
            Route::get('/contact', [ContactsController::class, 'show']);
            Route::match(['put', 'patch'], '/contact', [ContactsController::class, 'update']);
            Route::match(['put', 'patch'], '/contact/set_user', [ContactsController::class, 'setUser']);
            Route::post('/contact/destroy_custom_attributes', [ContactsController::class, 'destroyCustomAttributes']);

            Route::post('/labels', [LabelsController::class, 'store']);
            Route::delete('/labels/{label}', [LabelsController::class, 'destroy']);
        });
    });
