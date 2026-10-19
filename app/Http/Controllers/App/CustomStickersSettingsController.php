<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

// Trang Cài đặt / Kho sticker: kho riêng mở cho mọi thành viên account; tab kho nền
// tảng hiện theo auth.user.can_manage_platform_stickers (prop chung của mọi trang).
class CustomStickersSettingsController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('dashboard/settings/customStickers/Index');
    }
}
