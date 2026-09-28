<?php

namespace App\Http\Controllers\WebApi\Settings;

use App\Http\Controllers\Concerns\ServesStickerLibrary;
use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;

// Kho sticker nền tảng mở trong Cài đặt của dashboard cho người có quyền hệ
// thống (EnsureStickerLibraryAccess:platform); cùng action với console Super Admin.
class PlatformStickerPacksController extends Controller
{
    use ServesStickerLibrary;

    protected function libraryOwner(Request $request): ?Account
    {
        return null;
    }
}
