<?php

namespace App\Services\Email;

use App\Support\SafeHttp;
use finfo;
use Illuminate\Support\Facades\Log;
use Psr\Http\Message\StreamInterface;
use RuntimeException;
use Throwable;

/**
 * Tải hộ ảnh nhúng trong thư mà trình duyệt không tự hiện được (máy chủ ảnh đặt
 * `Cross-Origin-Resource-Policy: same-origin`...). Chỉ chuyển tiếp, không lưu: trình duyệt
 * nhận ảnh từ yona.vn rồi tự cache.
 */
class RemoteEmailImage
{
    public const MAX_BYTES = 5 * 1024 * 1024;

    private const CONNECT_TIMEOUT_SECONDS = 5;

    private const TIMEOUT_SECONDS = 15;

    private const CHUNK_BYTES = 64 * 1024;

    // Không có SVG: mở thẳng URL proxy trên yona.vn thì script trong SVG chạy được.
    private const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon'];

    /** @return array{bytes: string, content_type: string}|null */
    public function fetch(string $url): ?array
    {
        try {
            SafeHttp::assertPublicUrl($url);

            $response = SafeHttp::streamingRequest(self::CONNECT_TIMEOUT_SECONDS, self::TIMEOUT_SECONDS)
                ->withHeaders(['Accept' => 'image/*'])
                ->get($url);

            if (! $response->successful() || (int) $response->header('Content-Length') > self::MAX_BYTES) {
                return null;
            }

            $bytes = $this->readLimited($response->toPsrResponse()->getBody());
            $contentType = (string) (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);

            return in_array($contentType, self::ALLOWED_TYPES, true)
                ? ['bytes' => $bytes, 'content_type' => $contentType]
                : null;
        } catch (Throwable $exception) {
            Log::info('[EMAIL IMAGE] Không tải hộ được ảnh trong thư: '.$exception->getMessage());

            return null;
        }
    }

    private function readLimited(StreamInterface $body): string
    {
        $bytes = '';

        try {
            while (! $body->eof()) {
                $bytes .= $body->read(self::CHUNK_BYTES);

                if (strlen($bytes) > self::MAX_BYTES) {
                    throw new RuntimeException('ảnh vượt '.self::MAX_BYTES.' byte');
                }
            }
        } finally {
            $body->close();
        }

        return $bytes;
    }
}
