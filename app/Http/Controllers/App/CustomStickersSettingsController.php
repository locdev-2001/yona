<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\Stickers\StickerLibraryAccess;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Trang Cài đặt / Kho sticker: mở cho mọi quản trị viên account; phần nào dùng
// được do StickerLibraryAccess quyết, phần còn lại hiện trạng thái khoá.
class CustomStickersSettingsController extends Controller
{
    public function show(Request $request, Account $account, StickerLibraryAccess $access): Response
    {
        return Inertia::render('dashboard/settings/customStickers/Index', [
            'stickerLibraryAccess' => [
                'accountLibrary' => $access->canManageAccountLibrary($request->user(), $account),
                'platformLibrary' => $access->canManagePlatformLibrary($request->user()),
            ],
        ]);
    }
}
