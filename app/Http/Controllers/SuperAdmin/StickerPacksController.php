<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\ServesSharedStickerLibrary;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

// Kho sticker chung của Yona: mọi account đều thấy bộ đã xuất bản.
class StickerPacksController extends Controller
{
    use ServesSharedStickerLibrary;

    public const API_BASE_URL = '/super_admin/api';

    public function page(): Response
    {
        return Inertia::render('superadmin/StickerPacks', ['apiBaseUrl' => self::API_BASE_URL]);
    }
}
