<?php

namespace App\Services\Email;

use App\Models\Attachment;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Facades\Storage;

/**
 * Biến HTML của một thư thành tài liệu không còn đường gọi mạng nào: ảnh (cả ảnh
 * nhúng Yona đã lưu lẫn ảnh ở máy chủ ngoài) thành data URI, mọi thứ còn lại có
 * thể tự tải hay tự chạy (script, iframe, link, @import, on*) bị bỏ. Trình dựng
 * PDF nhờ vậy được chạy cách ly mạng hoàn toàn.
 *
 * Ảnh ngoài tải song song một lượt theo luật của RemoteEmailImage (chặn mạng nội bộ,
 * trần cỡ, chỉ ảnh bitmap), có trần số ảnh và tổng dung lượng; ảnh nào hỏng thì bỏ,
 * thư vẫn dựng được.
 */
final class SelfContainedHtml
{
    private const REMOVED_ELEMENTS = ['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'base', 'link', 'meta', 'audio', 'video', 'source', 'track', 'portal'];

    /** @var array<string, list<string>> thẻ → thuộc tính chứa một URL ảnh */
    private const IMAGE_URL_ATTRIBUTES = [
        'img' => ['src'],
        'input' => ['src'],
        'image' => ['href', 'xlink:href'],
        'table' => ['background'],
        'td' => ['background'],
        'th' => ['background'],
        'tr' => ['background'],
        'body' => ['background'],
    ];

    private const REMOVED_ATTRIBUTES = ['srcset', 'ping', 'formaction', 'action', 'poster', 'lowsrc', 'dynsrc'];

    private const CSS_URL_PATTERN = '/url\(\s*([\'"]?)(.*?)\1\s*\)/is';

    private const CSS_IMPORT_PATTERN = '/@import\s+[^;]+;?/i';

    private const MAX_REMOTE_IMAGES = 40;

    private const MAX_TOTAL_IMAGE_BYTES = 25 * 1024 * 1024;

    /** @var array<string, string|null> url → data URI (null = không dùng được) */
    private array $resolvedImages = [];

    private int $totalImageBytes = 0;

    /** @var array<int, true> */
    private array $embeddedAttachmentIds = [];

    /** @var array<string, Attachment> đường dẫn URL của tệp → đính kèm */
    private readonly array $storedImagesByPath;

    /** @param  iterable<Attachment>  $storedAttachments  tệp của chính tin, nơi ảnh cid đã được lưu */
    public function __construct(iterable $storedAttachments, private readonly RemoteEmailImage $remoteImages)
    {
        $byPath = [];

        foreach ($storedAttachments as $attachment) {
            if ($attachment->isImage() && $attachment->hasFile()) {
                $byPath[self::urlPath($attachment->fileUrl())] = $attachment;
            }
        }

        $this->storedImagesByPath = $byPath;
    }

    public function convert(string $html): string
    {
        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NONET | LIBXML_COMPACT);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new DOMXPath($document);

        foreach (self::REMOVED_ELEMENTS as $tag) {
            foreach (iterator_to_array($document->getElementsByTagName($tag)) as $element) {
                $element->parentNode?->removeChild($element);
            }
        }

        $this->fetchRemoteImages($this->imageUrlsIn($xpath));

        foreach (iterator_to_array($document->getElementsByTagName('style')) as $style) {
            $style->textContent = $this->rewriteCss($style->textContent);
        }

        foreach (iterator_to_array($xpath->query('//*')) as $element) {
            if ($element instanceof DOMElement) {
                $this->cleanElement($element);
            }
        }

        $body = $document->getElementsByTagName('body')->item(0);
        $head = $document->getElementsByTagName('head')->item(0);
        $styles = $head === null ? '' : implode('', array_map(
            fn ($style) => $document->saveHTML($style),
            iterator_to_array($head->getElementsByTagName('style')),
        ));

        if ($body === null) {
            return $styles;
        }

        $inner = '';

        foreach ($body->childNodes as $child) {
            $inner .= $document->saveHTML($child);
        }

        return $styles.$inner;
    }

    /** @return list<int> đính kèm của tin đã nằm sẵn trong thân thư (không cần gửi riêng) */
    public function embeddedAttachmentIds(): array
    {
        return array_keys($this->embeddedAttachmentIds);
    }

    private function cleanElement(DOMElement $element): void
    {
        foreach (iterator_to_array($element->attributes) as $attribute) {
            $name = strtolower($attribute->nodeName);

            if (str_starts_with($name, 'on') || in_array($name, self::REMOVED_ATTRIBUTES, true)) {
                $element->removeAttributeNode($attribute);
            }
        }

        $href = $element->getAttribute('href');

        if ($element->tagName === 'a' && $href !== '' && ! preg_match('#^(https?:|mailto:|tel:|\#)#i', trim($href))) {
            $element->removeAttribute('href');
        }

        foreach (self::IMAGE_URL_ATTRIBUTES[strtolower($element->tagName)] ?? [] as $attributeName) {
            if (! $element->hasAttribute($attributeName)) {
                continue;
            }

            $dataUri = $this->imageDataUri($element->getAttribute($attributeName));

            $dataUri === null
                ? $element->removeAttribute($attributeName)
                : $element->setAttribute($attributeName, $dataUri);
        }

        if ($element->hasAttribute('style')) {
            $element->setAttribute('style', $this->rewriteCss($element->getAttribute('style')));
        }
    }

    private function rewriteCss(string $css): string
    {
        $css = (string) preg_replace(self::CSS_IMPORT_PATTERN, '', $css);

        return (string) preg_replace_callback(self::CSS_URL_PATTERN, function (array $match): string {
            $dataUri = $this->imageDataUri($match[2]);

            return $dataUri === null ? 'none' : 'url("'.$dataUri.'")';
        }, $css);
    }

    /** @return list<string> mọi URL ảnh trong thư (thuộc tính ảnh, <style>, style="…"), đã chuẩn hoá */
    private function imageUrlsIn(DOMXPath $xpath): array
    {
        $urls = [];

        foreach (iterator_to_array($xpath->query('//*')) as $element) {
            if (! $element instanceof DOMElement) {
                continue;
            }

            foreach (self::IMAGE_URL_ATTRIBUTES[strtolower($element->tagName)] ?? [] as $attributeName) {
                if ($element->hasAttribute($attributeName)) {
                    $urls[] = self::normalizedUrl($element->getAttribute($attributeName));
                }
            }

            $css = strtolower($element->tagName) === 'style' ? $element->textContent : $element->getAttribute('style');
            preg_match_all(self::CSS_URL_PATTERN, $css, $matches);

            foreach ($matches[2] as $cssUrl) {
                $urls[] = self::normalizedUrl($cssUrl);
            }
        }

        return array_values(array_unique($urls));
    }

    /** @param  list<string>  $urls */
    private function fetchRemoteImages(array $urls): void
    {
        $remoteUrls = array_slice(array_values(array_filter(
            $urls,
            fn (string $url) => preg_match('#^https?://#i', $url) === 1 && ! isset($this->storedImagesByPath[self::urlPath($url)]),
        )), 0, self::MAX_REMOTE_IMAGES);

        foreach ($this->remoteImages->fetchMany($remoteUrls) as $url => $image) {
            $this->resolvedImages[$url] = $image !== null && $this->withinBudget(strlen($image['bytes']))
                ? self::dataUri($image['content_type'], $image['bytes'])
                : null;
        }
    }

    private function imageDataUri(string $url): ?string
    {
        $url = self::normalizedUrl($url);

        if (preg_match('#^data:image/[a-z0-9.+-]+[;,]#i', $url)) {
            return $url;
        }

        if (array_key_exists($url, $this->resolvedImages)) {
            return $this->resolvedImages[$url];
        }

        return $this->resolvedImages[$url] = $this->storedImage($url);
    }

    private static function normalizedUrl(string $url): string
    {
        $url = trim(html_entity_decode($url, ENT_QUOTES | ENT_HTML5));

        return str_starts_with($url, '//') ? 'https:'.$url : $url;
    }

    private function storedImage(string $url): ?string
    {
        $attachment = $this->storedImagesByPath[self::urlPath($url)] ?? null;

        if ($attachment === null) {
            return null;
        }

        $contents = Storage::disk($attachment->disk)->get((string) $attachment->path);

        if (! is_string($contents) || ! $this->withinBudget(strlen($contents))) {
            return null;
        }

        $this->embeddedAttachmentIds[(int) $attachment->id] = true;

        return self::dataUri((string) $attachment->content_type, $contents);
    }

    private function withinBudget(int $bytes): bool
    {
        if ($bytes > RemoteEmailImage::MAX_BYTES || $this->totalImageBytes + $bytes > self::MAX_TOTAL_IMAGE_BYTES) {
            return false;
        }

        $this->totalImageBytes += $bytes;

        return true;
    }

    private static function dataUri(string $contentType, string $contents): string
    {
        return 'data:'.($contentType ?: 'application/octet-stream').';base64,'.base64_encode($contents);
    }

    /** So theo đường dẫn để ảnh lưu ở Yona vẫn khớp khi APP_URL đổi tên miền sau lúc nhận thư. */
    private static function urlPath(string $url): string
    {
        return rawurldecode((string) parse_url($url, PHP_URL_PATH));
    }
}
