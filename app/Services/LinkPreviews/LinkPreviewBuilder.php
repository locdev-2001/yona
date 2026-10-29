<?php

namespace App\Services\LinkPreviews;

use App\Models\Message;
use App\Support\MimeType;
use App\Support\SafeHttp;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Psr\Http\Message\StreamInterface;
use Throwable;

/**
 * Thẻ xem trước liên kết của lõi cho mọi kênh: kênh nào gửi sẵn dữ liệu thẻ thì driver
 * đổ vào `content_attributes.link_preview`, phần còn thiếu (hoặc tin không có thẻ) lõi
 * bổ sung từ Open Graph của trang. Ảnh xem trước được lưu về kho của Yona vì URL CDN
 * của nền tảng thường có hạn dùng và chặn nhúng từ trang khác.
 */
class LinkPreviewBuilder
{
    public const ATTRIBUTE = 'link_preview';

    /** Tin đã là thẻ riêng của kênh (danh thiếp, chuyển khoản, cuộc gọi…) không gắn thêm thẻ liên kết. */
    private const CHANNEL_CARD_ATTRIBUTES = ['business_card', 'bank_card', 'reminder', 'call', 'friend_request', 'poll'];

    private const URL_PATTERN = '#\bhttps?://[^\s<>"\']+#iu';

    private const TRAILING_PUNCTUATION = '.,;:!?)]}\'"…';

    private const USER_AGENT = 'Mozilla/5.0 (compatible; YonaLinkPreview/1.0; +https://yona.vn)';

    private const CONNECT_TIMEOUT_SECONDS = 4;

    private const READ_TIMEOUT_SECONDS = 8;

    private const MAX_HTML_BYTES = 2 * 1024 * 1024;

    private const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

    private const CACHE_TTL_SECONDS = 86400;

    private const FAILED_CACHE_TTL_SECONDS = 3600;

    private const IMAGE_DISK = 'public';

    private const IMAGE_DIRECTORY = 'link-previews';

    private const IMAGE_EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];

    public function __construct(private readonly OpenGraphParser $parser) {}

    public function wantsPreview(Message $message): bool
    {
        if (! ($message->isIncoming() || $message->isOutgoing())
            || (int) $message->content_type !== Message::CONTENT_TYPES['text']
            || $message->inbox?->isEmail()
            || $message->attachments()->exists()) {
            return false;
        }

        $attributes = $message->content_attributes ?? [];

        foreach (self::CHANNEL_CARD_ATTRIBUTES as $key) {
            if (! empty($attributes[$key])) {
                return false;
            }
        }

        $preview = $attributes[self::ATTRIBUTE] ?? null;

        if (is_array($preview) && filled($preview['url'] ?? null)) {
            return blank($preview['title'] ?? null) || blank($preview['image'] ?? null) || ! $this->isStoredImage($preview['image']);
        }

        return $this->firstUrl((string) $message->content) !== null;
    }

    /**
     * Thẻ đầy đủ nhất ghép được cho tin: dữ liệu kênh gửi luôn thắng, Open Graph chỉ lấp
     * chỗ trống. Trả `null` khi không có gì mới để ghi.
     *
     * @return array<string, string>|null
     */
    public function previewFor(Message $message): ?array
    {
        $attributes = $message->content_attributes ?? [];
        $existing = is_array($attributes[self::ATTRIBUTE] ?? null) ? array_filter($attributes[self::ATTRIBUTE], 'filled') : [];
        $url = $existing['url'] ?? $this->firstUrl((string) $message->content);

        if ($url === null) {
            return null;
        }

        $preview = ['url' => $url, ...$existing];

        if (blank($preview['title'] ?? null) || blank($preview['image'] ?? null)) {
            $preview = [...$this->openGraph($url), ...$preview];
        }

        if (filled($preview['image'] ?? null) && ! $this->isStoredImage($preview['image'])) {
            $storedImage = $this->storeImage($preview['image']);

            if ($storedImage !== null) {
                $preview['image'] = $storedImage;
            }
        }

        if ($preview == $existing || array_keys($preview) === ['url']) {
            return null;
        }

        return $preview;
    }

    public function firstUrl(string $content): ?string
    {
        if (! preg_match(self::URL_PATTERN, $content, $match)) {
            return null;
        }

        $url = rtrim($match[0], self::TRAILING_PUNCTUATION);

        return filter_var($url, FILTER_VALIDATE_URL) === false ? null : $url;
    }

    /** @return array<string, string> */
    private function openGraph(string $url): array
    {
        $cacheKey = 'link_preview:'.sha1($url);
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        $preview = $this->fetchOpenGraph($url);
        Cache::put($cacheKey, $preview, $preview === [] ? self::FAILED_CACHE_TTL_SECONDS : self::CACHE_TTL_SECONDS);

        return $preview;
    }

    /** @return array<string, string> */
    private function fetchOpenGraph(string $url): array
    {
        try {
            SafeHttp::assertPublicUrl($url);

            $response = SafeHttp::streamingRequest(self::CONNECT_TIMEOUT_SECONDS, self::READ_TIMEOUT_SECONDS)
                ->withHeaders(['User-Agent' => self::USER_AGENT, 'Accept' => 'text/html,application/xhtml+xml', 'Accept-Language' => 'vi,en;q=0.8'])
                ->get($url);

            if (! $response->successful() || ! str_contains(strtolower((string) $response->header('Content-Type')), 'html')) {
                return [];
            }

            return $this->parser->parse($this->readCapped($response->toPsrResponse()->getBody(), self::MAX_HTML_BYTES, '</head>'), $url);
        } catch (Throwable $exception) {
            Log::info("[LINK_PREVIEW] Không đọc được trang {$url}: {$exception->getMessage()}");

            return [];
        }
    }

    private function storeImage(string $imageUrl): ?string
    {
        $path = null;

        try {
            SafeHttp::assertPublicUrl($imageUrl);

            $response = SafeHttp::streamingRequest(self::CONNECT_TIMEOUT_SECONDS, self::READ_TIMEOUT_SECONDS)
                ->withHeaders(['User-Agent' => self::USER_AGENT, 'Accept' => 'image/*'])
                ->get($imageUrl);

            if (! $response->successful() || (int) $response->header('Content-Length') > self::MAX_IMAGE_BYTES) {
                return null;
            }

            $contents = $this->readCapped($response->toPsrResponse()->getBody(), self::MAX_IMAGE_BYTES + 1);
            $extension = self::IMAGE_EXTENSIONS[MimeType::sniffContents($contents) ?? ''] ?? null;

            if ($extension === null || strlen($contents) > self::MAX_IMAGE_BYTES) {
                return null;
            }

            $path = self::IMAGE_DIRECTORY.'/'.sha1($contents).'.'.$extension;
            $disk = Storage::disk(self::IMAGE_DISK);

            if (! $disk->exists($path)) {
                $disk->put($path, $contents);
            }

            return $disk->url($path);
        } catch (Throwable $exception) {
            Log::info("[LINK_PREVIEW] Không lưu được ảnh xem trước {$imageUrl}: {$exception->getMessage()}");

            return null;
        }
    }

    private function isStoredImage(mixed $imageUrl): bool
    {
        return is_string($imageUrl)
            && str_starts_with($imageUrl, rtrim(Storage::disk(self::IMAGE_DISK)->url(self::IMAGE_DIRECTORY), '/').'/');
    }

    /** `$stopAfter`: dừng sớm khi đã đọc tới chuỗi này (thẻ meta nằm hết trong `<head>`). */
    private function readCapped(StreamInterface $body, int $maxBytes, ?string $stopAfter = null): string
    {
        $contents = '';

        try {
            while (! $body->eof() && strlen($contents) < $maxBytes) {
                $chunk = $body->read(min(65536, $maxBytes - strlen($contents)));

                if ($chunk === '') {
                    break;
                }

                $contents .= $chunk;

                if ($stopAfter !== null && stripos($contents, $stopAfter, max(0, strlen($contents) - strlen($chunk) - strlen($stopAfter))) !== false) {
                    break;
                }
            }
        } finally {
            $body->close();
        }

        return $contents;
    }
}
