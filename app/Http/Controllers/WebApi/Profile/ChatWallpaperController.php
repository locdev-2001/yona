<?php

namespace App\Http\Controllers\WebApi\Profile;

use App\Http\Controllers\Controller;
use App\Services\Users\ChatWallpaperService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

// Chỉ tải ảnh lên kho; chọn/bỏ nền đi qua PUT /profile (ui_settings.chat_wallpaper).
class ChatWallpaperController extends Controller
{
    public function store(Request $request, ChatWallpaperService $wallpapers): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'file',
                'mimes:'.implode(',', ChatWallpaperService::UPLOAD_MIMES),
                'max:'.ChatWallpaperService::UPLOAD_MAX_KILOBYTES,
            ],
        ]);

        try {
            $url = $wallpapers->storeImage($request->user(), $request->file('image'));
        } catch (RuntimeException) {
            return response()->json(['message' => __('chat_wallpaper.UPLOAD_UNREADABLE')], 422);
        }

        return response()->json(['url' => $url], 201);
    }
}
