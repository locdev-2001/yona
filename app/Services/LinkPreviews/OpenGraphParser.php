<?php

namespace App\Services\LinkPreviews;

use DOMDocument;
use DOMXPath;

/**
 * Đọc thẻ Open Graph (rơi về thẻ Twitter, `<title>`, meta description) từ HTML của
 * một trang. Thuần, không I/O: URL ảnh tương đối được đổi thành tuyệt đối theo trang.
 */
final class OpenGraphParser
{
    private const TEXT_MAX_LENGTH = 300;

    /** @return array{title?: string, description?: string, image?: string, source?: string} */
    public function parse(string $html, string $pageUrl): array
    {
        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $metas = $this->metaContents(new DOMXPath($document));
        $titleNode = $document->getElementsByTagName('title')->item(0);
        $image = $metas['og:image:secure_url'] ?? $metas['og:image'] ?? $metas['twitter:image'] ?? $metas['twitter:image:src'] ?? null;

        // Trang chặn người lạ (tường đăng nhập) vẫn trả og:title chung chung nhưng không có
        // ảnh lẫn og:url; thẻ dựng từ đó chỉ gây hiểu nhầm nên coi như không có.
        if ($image === null && ! isset($metas['og:url'])) {
            return [];
        }

        return array_filter([
            'title' => $this->text($metas['og:title'] ?? $metas['twitter:title'] ?? $titleNode?->textContent),
            'description' => $this->text($metas['og:description'] ?? $metas['twitter:description'] ?? $metas['description'] ?? null),
            'image' => $image === null ? null : $this->absoluteUrl($image, $pageUrl),
            'source' => $this->text($metas['og:site_name'] ?? null),
        ], fn (?string $value) => filled($value));
    }

    /** @return array<string, string> khoá thường hoá chữ thường, thẻ xuất hiện trước thắng */
    private function metaContents(DOMXPath $xpath): array
    {
        $contents = [];

        foreach ($xpath->query('//meta[@content]') ?: [] as $meta) {
            $key = strtolower(trim($meta->getAttribute('property') ?: $meta->getAttribute('name')));

            if ($key !== '' && ! array_key_exists($key, $contents)) {
                $contents[$key] = $meta->getAttribute('content');
            }
        }

        return $contents;
    }

    private function text(?string $value): ?string
    {
        $collapsed = trim(preg_replace('/\s+/u', ' ', html_entity_decode((string) $value, ENT_QUOTES | ENT_HTML5)) ?? '');

        return $collapsed === '' ? null : mb_substr($collapsed, 0, self::TEXT_MAX_LENGTH);
    }

    private function absoluteUrl(string $url, string $pageUrl): ?string
    {
        $url = trim(html_entity_decode($url, ENT_QUOTES | ENT_HTML5));

        if (preg_match('#^https?://#i', $url)) {
            return $url;
        }

        $page = parse_url($pageUrl);

        if (! isset($page['scheme'], $page['host'])) {
            return null;
        }

        $origin = $page['scheme'].'://'.$page['host'].(isset($page['port']) ? ':'.$page['port'] : '');

        return match (true) {
            str_starts_with($url, '//') => $page['scheme'].':'.$url,
            str_starts_with($url, '/') => $origin.$url,
            $url === '' => null,
            default => $origin.rtrim(dirname($page['path'] ?? '/'), '/').'/'.$url,
        };
    }
}
