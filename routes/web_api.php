<?php

use App\Http\Controllers\Chat\ConversationAssignController;
use App\Http\Controllers\Chat\ConversationAttachmentController;
use App\Http\Controllers\Chat\ConversationLeadController;
use App\Http\Controllers\Chat\ConversationPanelController;
use App\Http\Controllers\Chat\ConversationPhoneController;
use App\Http\Controllers\Chat\ConversationStreamController;
use App\Http\Controllers\Chat\InboxController;
use App\Http\Controllers\Chat\InboxSettingController;
use App\Http\Controllers\Chat\MessageInteractionController;
use App\Http\Controllers\Chat\QuickReplyController;
use App\Http\Controllers\Chat\ZaloPersonal\ZaloConnectionController;
use Illuminate\Support\Facades\Route;

/*
 * Mặt tiền thứ hai (docs/code-standards.md §0.4): API do chính FE của web gọi.
 *
 * Xác thực bằng session như `web.php` — khác nhau ở thứ TRẢ VỀ: `web.php` render
 * Inertia, file này trả JSON. Đổi thoải mái vì FE đi cùng phiên bản; hợp đồng ổn
 * định cho bên ngoài thì nằm ở `api.php`.
 *
 * ĐƯỜNG DẪN GIỮ NGUYÊN, không thêm tiền tố. Hai lý do cứng:
 *   - `route('inbox.attachments.show', …)` được ghi thẳng vào cột
 *     `messages.media_url` lúc gửi ảnh; đổi đường dẫn là mọi tin cũ mất ảnh;
 *   - màn hình Zalo gọi `fetch()` bằng đường dẫn viết cứng, không qua Ziggy.
 *
 * Nạp TRƯỚC `web.php` (xem `bootstrap/app.php`): `GET /inbox/{conversation}`
 * bên kia là mẫu bắt-tất, sẽ nuốt `GET /inbox/quick-replies` nếu đăng ký trước.
 * `whereUuid` cũng chặn được, nhưng thứ tự nạp là lớp phòng thủ không phụ thuộc
 * vào việc ai đó nhớ giữ lại ràng buộc đó.
 */

Route::middleware(['auth', 'workspace'])->group(function () {
    // Vòng đời kết nối Zalo — bật/tắt theo config như mọi phích cắm ngoài.
    if (config('integrations.zalo_personal.enabled')) {
        Route::prefix('integrations')->name('integrations.zalo.')->group(function () {
            Route::controller(ZaloConnectionController::class)
                ->prefix('zalo')
                ->group(function () {
                    Route::post('/', 'store')->name('store');
                    Route::get('/qr-status', 'qr')->name('qr');
                    Route::post('/promote', 'promote')->name('promote');
                    Route::delete('/{zaloConnection}', 'destroy')->name('destroy');
                });
        });
    }

    Route::get('/inbox/quick-replies', [QuickReplyController::class, 'index'])->name('inbox.quick-replies.index');
    Route::post('/inbox/quick-replies', [QuickReplyController::class, 'store'])->name('inbox.quick-replies.store');
    Route::put('/inbox/quick-replies/{quickReply}', [QuickReplyController::class, 'update'])->name('inbox.quick-replies.update');
    Route::delete('/inbox/quick-replies/{quickReply}', [QuickReplyController::class, 'destroy'])->name('inbox.quick-replies.destroy');

    Route::post('/inbox/resync', [InboxController::class, 'resync'])->name('inbox.resync');
    Route::get('/inbox/conversations/{conversation}/messages', [InboxController::class, 'messages'])
        ->name('inbox.messages');
    // P05 — stream hợp nhất messages + gap marker (session_gap), keyset cursor.
    Route::get('/inbox/conversations/{conversation}/stream', ConversationStreamController::class)
        ->name('inbox.stream');
    // Tin đến khi hội thoại đang mở trên màn hình → FE đánh dấu đã đọc ngay.
    Route::post('/inbox/conversations/{conversation}/read', [InboxController::class, 'markRead'])
        ->name('inbox.read');
    Route::post('/inbox/conversations/{conversation}/messages', [InboxController::class, 'send'])
        ->name('inbox.send');
    Route::post('/inbox/conversations/{conversation}/lead', [ConversationLeadController::class, 'store'])
        ->name('inbox.lead.store');
    // P04 — composer media: upload multipart trước, send JSON {attachment_id} sau.
    Route::post('/inbox/conversations/{conversation}/attachments', [ConversationAttachmentController::class, 'store'])
        ->name('inbox.attachments.store');
    Route::get('/inbox/attachments/{attachmentKey}', [ConversationAttachmentController::class, 'show'])
        ->name('inbox.attachments.show');
    // P05 — nhập tay SĐT + verify qua kênh (manual_verified).
    Route::put('/inbox/conversations/{conversation}/phone', [ConversationPhoneController::class, 'update'])
        ->name('inbox.phone.update');
    // P06a — reaction (dispatcher caller đầu tiên) + sticker search.
    Route::post('/inbox/conversations/{conversation}/messages/{message}/reaction', [MessageInteractionController::class, 'react'])
        ->name('inbox.reaction');
    Route::get('/inbox/conversations/{conversation}/stickers', [MessageInteractionController::class, 'stickers'])
        ->name('inbox.stickers');
    // P07 — tầng CRM channel-agnostic: gán, panel (label/note/member), canned replies.
    Route::patch('/inbox/conversations/{conversation}/assign', [ConversationAssignController::class, 'update'])
        ->name('inbox.assign');
    Route::get('/inbox/conversations/{conversation}/panel', ConversationPanelController::class)
        ->name('inbox.panel');
    // P06b — seen-sync toggle (default OFF, chỉ tenant.zalo.manage).
    Route::put('/inbox/settings/seen-sync', [InboxSettingController::class, 'updateSeenSync'])
        ->name('inbox.settings.seen-sync');
});
