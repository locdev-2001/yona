<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\Stickers\StickerLibraryAccess;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Trang Cài đặt / Kho sticker: kho riêng mở cho mọi thành viên account; tab
// kho nền tảng chỉ hiện khi StickerLibraryAccess cho phép.
class CustomStickersSettingsController extends Controller
{
    public function show(Request $request, Account $account, StickerLibraryAccess $access): Response
    {
        return Inertia::render('dashboard/settings/customStickers/Index', [
            'stickerLibraryAccess' => [
                'platformLibrary' => $access->canManagePlatformLibrary($request->user()),
            ],
        ]);
    }
}
