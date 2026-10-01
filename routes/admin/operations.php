<?php

// Vận hành tenant và dữ liệu của console quản trị: sức khoẻ kênh, account 360,
// trình duyệt dữ liệu, tìm kiếm, nhật ký thao tác, kho sticker theo account.
// Nạp bên trong nhóm /admin đã qua auth:super_admin + bắt buộc 2FA ở routes/web.php.

use App\Http\Controllers\SuperAdmin\AccountOverviewController;
use App\Http\Controllers\SuperAdmin\AccountsController;
use App\Http\Controllers\SuperAdmin\AccountStickerPacksController;
use App\Http\Controllers\SuperAdmin\AuditLogsController;
use App\Http\Controllers\SuperAdmin\ChannelHealthController;
use App\Http\Controllers\SuperAdmin\DataBrowserController;
use App\Http\Controllers\SuperAdmin\SearchController;
use Illuminate\Support\Facades\Route;

Route::get('/channel_health', [ChannelHealthController::class, 'index']);

Route::get('/accounts/{id}/overview', [AccountOverviewController::class, 'show'])->whereNumber('id');
Route::post('/accounts/{id}/suspend', [AccountsController::class, 'suspend'])->whereNumber('id');
Route::post('/accounts/{id}/unsuspend', [AccountsController::class, 'unsuspend'])->whereNumber('id');

Route::get('/audit_logs', [AuditLogsController::class, 'index']);

Route::get('/api/search', [SearchController::class, 'index'])->middleware('throttle:60,1');

// Chỉ đọc: không có route ghi nào cho dữ liệu thô.
Route::get('/data', [DataBrowserController::class, 'index']);
Route::get('/data/{table}', [DataBrowserController::class, 'show'])->where('table', '[a-z0-9_]+');

Route::get('/accounts/{accountId}/sticker_packs', [AccountStickerPacksController::class, 'page'])->whereNumber('accountId');
Route::prefix('/api/accounts/{accountId}/sticker_packs')->whereNumber('accountId')->group(function () {
    Route::get('/', [AccountStickerPacksController::class, 'index']);
    Route::post('/', [AccountStickerPacksController::class, 'store']);
    Route::get('/{packId}', [AccountStickerPacksController::class, 'show'])->whereNumber('packId');
    Route::match(['put', 'patch'], '/{packId}', [AccountStickerPacksController::class, 'update'])->whereNumber('packId');
    Route::delete('/{packId}', [AccountStickerPacksController::class, 'destroy'])->whereNumber('packId');
    Route::post('/{packId}/publish', [AccountStickerPacksController::class, 'publish'])->whereNumber('packId');
    Route::post('/{packId}/unpublish', [AccountStickerPacksController::class, 'unpublish'])->whereNumber('packId');
    Route::post('/{packId}/move', [AccountStickerPacksController::class, 'move'])->whereNumber('packId');
    Route::post('/{packId}/stickers', [AccountStickerPacksController::class, 'upload'])
        ->whereNumber('packId')
        ->middleware('throttle:sticker-uploads');
    Route::put('/{packId}/stickers/order', [AccountStickerPacksController::class, 'reorder'])->whereNumber('packId');
    Route::get('/{packId}/stickers/{stickerId}/original', [AccountStickerPacksController::class, 'stickerOriginal'])
        ->whereNumber(['packId', 'stickerId']);
    Route::patch('/{packId}/stickers/{stickerId}', [AccountStickerPacksController::class, 'updateSticker'])
        ->whereNumber(['packId', 'stickerId'])
        ->middleware('throttle:sticker-uploads');
    Route::delete('/{packId}/stickers/{stickerId}', [AccountStickerPacksController::class, 'destroySticker'])
        ->whereNumber(['packId', 'stickerId']);
});
