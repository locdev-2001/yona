<?php

namespace App\Http\Controllers;

use App\Support\LandingSeo;
use Illuminate\Http\Response;

/**
 * sitemap.xml cho công cụ tìm kiếm.
 *
 * KHÔNG có `lastmod` và `priority`, cả hai đều cố ý:
 *
 * `lastmod` từng sinh bằng `now()`, nghĩa là mọi URL báo "vừa sửa hôm nay" mỗi
 * ngày kể cả khi trang không đổi một chữ. Google phát hiện `lastmod` không khớp
 * nội dung thì bỏ qua trường đó cho cả site — tệ hơn là không khai. Ngày thật
 * chỉ có được khi nội dung trang nằm trong database; các trang này là component
 * React tĩnh nên không có ngày nào để khai.
 *
 * `priority` thì Google đã công bố không dùng từ 2023.
 *
 * Chỉ liệt kê trang thật đang trả 200 và KHÔNG khai `noindex`. Trang cảm ơn
 * (`/dat-lich-demo/cam-on`) cố ý vắng mặt: nó `noindex`, liệt kê vào đây là tự
 * mâu thuẫn với chính thẻ meta của nó.
 */
class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $entries = array_map(
            fn (string $url) => sprintf('<url><loc>%s</loc></url>', e($url)),
            LandingSeo::sitemapUrls(),
        );

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .implode("\n", $entries)."\n"
            .'</urlset>'."\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
