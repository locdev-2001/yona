<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Services\Email\RemoteEmailImage;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Ảnh trong thư mà trình duyệt không tự tải được: chỉ người đã đăng nhập, ảnh bitmap, không lưu. */
class EmailImagesController extends Controller
{
    private const BROWSER_CACHE_SECONDS = 7 * 24 * 3600;

    public function show(Request $request, RemoteEmailImage $images): Response
    {
        $url = $request->validate(['url' => ['required', 'string', 'max:2048', 'url:http,https']])['url'];
        $image = $images->fetch($url);

        abort_if($image === null, 404);

        return response($image['bytes'], 200, [
            'Content-Type' => $image['content_type'],
            'Cache-Control' => 'private, max-age='.self::BROWSER_CACHE_SECONDS.', immutable',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
