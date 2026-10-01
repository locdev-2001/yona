<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\ServesStickerLibrary;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Support\SuperAdminArea;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Kho sticker nền tảng (kho chung) của Yona: mọi account đều thấy bộ đã xuất bản.
class StickerPacksController extends Controller
{
    use ServesStickerLibrary;

    public const API_BASE_URL = '/'.SuperAdminArea::PREFIX.'/api';

    public function page(): Response
    {
        return Inertia::render('superadmin/StickerPacks', ['apiBaseUrl' => self::API_BASE_URL]);
    }

    protected function libraryOwner(Request $request): ?Account
    {
        return null;
    }
}
