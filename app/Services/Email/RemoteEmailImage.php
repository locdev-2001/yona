<?php

namespace App\Services\Email;

use App\Support\SafeHttp;
use finfo;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Psr\Http\Message\ResponseInterface;
use RuntimeException;
use Throwable;

/**
 * Luật DUY NHẤT để máy chủ tải hộ ảnh nằm trong thư: proxy cho ảnh trình duyệt không
 * tự hiện được (máy chủ ảnh đặt `Cross-Origin-Resource-Policy: same-origin`...) và
 * ảnh nhúng vào PDF của thư. Chỉ http/https ra mạng công khai, trần cỡ, loại ảnh đoán
 * từ nội dung. Không lưu gì.
 */
class RemoteEmailImage
{
    public const MAX_BYTES = 5 * 1024 * 1024;

    private const CONNECT_TIMEOUT_SECONDS = 5;

    private const TIMEOUT_SECONDS = 15;

    // Không có SVG: mở thẳng URL proxy trên yona.vn thì script trong SVG chạy được.
    private const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon'];

    /** @return array{bytes: string, content_type: string}|null */
    public function fetch(string $url): ?array
    {
        return $this->fetchMany([$url])[$url];
    }

    /**
     * Tải song song: cả lượt chỉ chờ bằng ảnh chậm nhất, không cộng dồn từng ảnh.
     *
     * @param  list<string>  $urls
     * @return array<string, array{bytes: string, content_type: string}|null>
     */
    public function fetchMany(array $urls): array
    {
        $images = array_fill_keys($urls, null);
        $publicUrls = array_values(array_filter(array_keys($images), fn (string $url) => $this->isPublic($url)));

        if ($publicUrls === []) {
            return $images;
        }

        $responses = Http::pool(fn (Pool $pool) => array_map(
            fn (string $url) => SafeHttp::guarded($pool->as($url), self::CONNECT_TIMEOUT_SECONDS, self::TIMEOUT_SECONDS)
                ->withHeaders(['Accept' => 'image/*'])
                ->withOptions([
                    'on_headers' => self::rejectDeclaredOversize(...),
                    'curl' => [CURLOPT_MAXFILESIZE_LARGE => self::MAX_BYTES],
                ])
                ->get($url),
            $publicUrls,
        ));

        foreach ($responses as $url => $response) {
            $images[$url] = $response instanceof Response
                ? $this->image($response)
                : $this->failed($response instanceof Throwable ? $response->getMessage() : 'không có phản hồi');
        }

        return $images;
    }

    private function isPublic(string $url): bool
    {
        try {
            SafeHttp::assertPublicUrl($url);

            return true;
        } catch (Throwable $exception) {
            $this->failed($exception->getMessage());

            return false;
        }
    }

    /** @return array{bytes: string, content_type: string}|null */
    private function image(Response $response): ?array
    {
        $bytes = $response->body();

        if (! $response->successful() || $bytes === '' || strlen($bytes) > self::MAX_BYTES) {
            return null;
        }

        $contentType = (string) (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);

        return in_array($contentType, self::ALLOWED_TYPES, true)
            ? ['bytes' => $bytes, 'content_type' => $contentType]
            : null;
    }

    private function failed(string $reason): null
    {
        Log::info('[EMAIL IMAGE] Không tải hộ được ảnh trong thư: '.$reason);

        return null;
    }

    /** Chỉ hỏng request của ảnh này; ảnh không khai cỡ thì curl tự dừng ở MAX_BYTES. */
    private static function rejectDeclaredOversize(ResponseInterface $response): void
    {
        if ((int) $response->getHeaderLine('Content-Length') > self::MAX_BYTES) {
            throw new RuntimeException('ảnh vượt '.self::MAX_BYTES.' byte');
        }
    }
}
