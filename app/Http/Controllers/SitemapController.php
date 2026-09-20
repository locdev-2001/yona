<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

/**
 * sitemap.xml sinh động từ danh sách route, không phải tệp tĩnh trong public/.
 *
 * Tệp tĩnh thì URL thành cố định (sai ngay khi tên miền khác) và mỗi trang mới
 * là một lần phải nhớ sửa tay. Ở đây chỉ liệt kê trang **thật đang trả 200** —
 * sitemap trỏ vào 404 làm Search Console báo lỗi cả sitemap.
 *
 * Chưa có: bài Help Center (#47 — chưa có bài nào), trang điều khoản và chính
 * sách (#25 — còn 404). Thêm vào đây khi chúng tồn tại.
 */
class SitemapController extends Controller
{
    /** Tên route => mức ưu tiên. Trang cảm ơn cố tình không có: không index. */
    private const PAGES = [
        'home' => '1.0',
        'channels.zalo_personal' => '0.8',
        'demo_request.create' => '0.8',
    ];

    public function __invoke(): Response
    {
        $today = now()->toDateString();

        $entries = array_map(fn (string $name, string $priority) => sprintf(
            '<url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>',
            e(route($name)),
            $today,
            $priority,
        ), array_keys(self::PAGES), array_values(self::PAGES));

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .implode("\n", $entries)."\n"
            .'</urlset>'."\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
