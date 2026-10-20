<?php

namespace App\Services\Email;

use App\Models\Attachment;
use App\Support\SafeHttp;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Facades\Storage;
use Psr\Http\Message\StreamInterface;
use Throwable;

/**
 * Biến HTML của một thư thành tài liệu không còn đường gọi mạng nào: ảnh (cả ảnh
 * nhúng Yona đã lưu lẫn ảnh ở máy chủ ngoài) thành data URI, mọi thứ còn lại có
 * thể tự tải hay tự chạy (script, iframe, link, @import, on*) bị bỏ. Trình dựng
 * PDF nhờ vậy được chạy cách ly mạng hoàn toàn.
 *
 * Ảnh ngoài chỉ tải qua SafeHttp (http/https, chặn mạng nội bộ), có trần số ảnh,
 * cỡ mỗi ảnh và tổng dung lượng; ảnh nào hỏng thì bỏ, thư vẫn dựng được.
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

    private const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

    private const MAX_TOTAL_IMAGE_BYTES = 25 * 1024 * 1024;

    private const CONNECT_TIMEOUT_SECONDS = 3;

    private const FETCH_TIMEOUT_SECONDS = 8;

    /** Dựng PDF chạy trong request chuyển tiếp: hết quỹ giờ thì ảnh ngoài còn lại bị bỏ. */
    private const REMOTE_FETCH_BUDGET_SECONDS = 20;

    private ?float $remoteFetchStartedAt = null;

    /** @var array<string, string|null> url → data URI (null = không dùng được) */
    private array $resolvedImages = [];

    private int $remoteImageCount = 0;

    private int $totalImageBytes = 0;

    /** @var array<int, true> */
    private array $embeddedAttachmentIds = [];

    /** @var array<string, Attachment> đường dẫn URL của tệp → đính kèm */
    private readonly array $storedImagesByPath;

    /** @param  iterable<Attachment>  $storedAttachments  tệp của chính tin, nơi ảnh cid đã được lưu */
    public function __construct(iterable $storedAttachments)
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

    private function imageDataUri(string $url): ?string
    {
        $url = trim(html_entity_decode($url, ENT_QUOTES | ENT_HTML5));

        if (str_starts_with($url, '//')) {
            $url = 'https:'.$url;
        }

        if (preg_match('#^data:image/[a-z0-9.+-]+[;,]#i', $url)) {
            return $url;
        }

        return $this->resolvedImages[$url] ??= $this->storedImage($url) ?? $this->remoteImage($url);
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

    private function remoteImage(string $url): ?string
    {
        if (! preg_match('#^https?://#i', $url) || $this->remoteImageCount >= self::MAX_REMOTE_IMAGES || $this->remoteBudgetSpent()) {
            return null;
        }

        $this->remoteImageCount++;

        try {
            SafeHttp::assertPublicUrl($url);
            $response = SafeHttp::streamingRequest(self::CONNECT_TIMEOUT_SECONDS, self::FETCH_TIMEOUT_SECONDS)->get($url);
        } catch (Throwable) {
            return null;
        }

        $contentType = strtolower(trim(explode(';', (string) $response->header('Content-Type'))[0]));

        if (! $response->successful() || ! str_starts_with($contentType, 'image/')) {
            return null;
        }

        $contents = $this->readCapped($response->toPsrResponse()->getBody());

        return $contents !== null && $this->withinBudget(strlen($contents))
            ? self::dataUri($contentType, $contents)
            : null;
    }

    private function remoteBudgetSpent(): bool
    {
        $this->remoteFetchStartedAt ??= microtime(true);

        return microtime(true) - $this->remoteFetchStartedAt > self::REMOTE_FETCH_BUDGET_SECONDS;
    }

    private function readCapped(StreamInterface $stream): ?string
    {
        $contents = '';

        while (! $stream->eof()) {
            $contents .= $stream->read(65536);

            if (strlen($contents) > self::MAX_IMAGE_BYTES) {
                return null;
            }
        }

        return $contents === '' ? null : $contents;
    }

    private function withinBudget(int $bytes): bool
    {
        if ($bytes > self::MAX_IMAGE_BYTES || $this->totalImageBytes + $bytes > self::MAX_TOTAL_IMAGE_BYTES) {
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
