<?php

namespace App\Services\Channels;

use App\Models\Attachment;
use App\Support\FileUploadLimit;
use App\Support\MimeType;
use App\Support\SafeHttp;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Psr\Http\Message\UriInterface;
use RuntimeException;
use Throwable;

/**
 * Thay cho gem Down: tải một tệp từ URL của nhà cung cấp rồi trả về
 * mảng thuộc tính cho Attachment. Mọi kênh dùng chung một đường tải, nên ba lớp
 * bảo vệ cũng nằm gọn ở đây:
 *
 *  1. URL do nhà cung cấp (hoặc client của họ) đặt phải trỏ ra mạng công cộng
 *     (`SafeHttp`, tôn trọng `ALLOW_PRIVATE_WEBHOOK_URLS`) — kể cả sau chuyển hướng.
 *  2. Nội dung ghi thẳng ra tệp tạm theo từng khối và dừng ngay khi vượt hạn mức
 *     (`write_response_body` + `FileTooLargeError` của bản gốc), nên tệp 1GB
 *     không kéo theo 1GB RAM của worker.
 *  3. Kiểu MIME lấy từ chính nội dung, không tin lời khai của máy chủ lạ.
 *
 * Tệp 0 byte cũng là thất bại: CDN đôi khi trả 200 kèm thân rỗng, lưu nó như
 * tệp hợp lệ thì bong bóng thành ảnh vỡ và mất luôn đường mở tệp gốc.
 *
 * Mọi thất bại đều trả `null` chứ không ném ra ngoài: bên gọi dựng đính kèm
 * `fallback` để tin của khách vẫn còn dấu vết (`fallbackAttributes`).
 */
class RemoteAttachmentDownloader
{
    /** SafeFetch::DEFAULT_OPEN_TIMEOUT / DEFAULT_READ_TIMEOUT của bản gốc. */
    public const CONNECT_TIMEOUT_SECONDS = 5;

    public const READ_TIMEOUT_SECONDS = 30;

    private const MAX_REDIRECTS = 3;

    private const CHUNK_BYTES = 256 * 1024;

    /**
     * @param  array<string, string>  $headers
     * @param  array{0: string, 1: string}|null  $basicAuth
     * @return array<string, mixed>|null
     */
    public static function download(
        string $url,
        ?int $accountId,
        ?string $filename = null,
        array $headers = [],
        ?array $basicAuth = null,
    ): ?array {
        $temporaryPath = null;

        try {
            SafeHttp::assertPublicUrl($url);

            $response = self::request($headers, $basicAuth)->get($url);

            if (! $response->successful()) {
                Log::warning("[CHANNEL] Không tải được tệp đính kèm ({$response->status()}): {$url}");

                return null;
            }

            self::assertDeclaredSizeWithinLimit($response);

            $temporaryPath = self::streamToTemporaryFile($response);

            if (filesize($temporaryPath) === 0) {
                Log::warning("[CHANNEL] Không tải được tệp đính kèm (thân rỗng, 0 byte): {$url}");

                return null;
            }

            $contentType = MimeType::resolveForFile($response->header('Content-Type'), $temporaryPath);

            return Attachment::storeLocalFile(
                $temporaryPath,
                $filename ?: self::filenameFrom($url, $contentType),
                $contentType,
                $accountId,
            );
        } catch (Throwable $exception) {
            Log::warning('[CHANNEL] Không tải được tệp đính kèm: '.$exception->getMessage());

            return null;
        } finally {
            if ($temporaryPath !== null && is_file($temporaryPath)) {
                @unlink($temporaryPath);
            }
        }
    }

    /**
     * Đính kèm `fallback` cho tệp tải hỏng — contract sẵn có của lõi, bong bóng
     * hiện tên tệp (và liên kết gốc nếu có) thay vì để tin trống trơn.
     * `$externalUrl` chỉ truyền khi URL mở được mà không kèm bí mật của kênh;
     * URL của Telegram nhúng bot token, của Whatsapp/Twilio/Line/TikTok cần
     * header hoặc basic auth riêng — những URL đó KHÔNG được rò ra trình duyệt.
     *
     * Cũng chính vì mở được không cần bí mật, đính kèm có `$externalUrl` được tải
     * lại nền (`RetryAttachmentDownloadJob`); `$reportedFileType` là loại kênh báo
     * về, để lượt tải lại suy `file_type` y như đường tải gốc.
     *
     * @return array<string, mixed>
     */
    public static function fallbackAttributes(
        ?int $accountId,
        ?string $filename = null,
        ?string $externalUrl = null,
        ?int $reportedFileType = null,
    ): array {
        $attributes = [
            'account_id' => $accountId,
            'file_type' => Attachment::FILE_TYPE_FALLBACK,
            'external_url' => $externalUrl,
            'fallback_title' => filled($filename) ? mb_substr((string) $filename, 0, 255) : null,
        ];

        if (filled($externalUrl)) {
            $attributes['meta'] = [Attachment::META_DOWNLOAD_RETRY => ['reported_file_type' => $reportedFileType]];
        }

        return $attributes;
    }

    /**
     * @param  array<string, string>  $headers
     * @param  array{0: string, 1: string}|null  $basicAuth
     */
    private static function request(array $headers, ?array $basicAuth): PendingRequest
    {
        $request = Http::withHeaders($headers)
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout(self::READ_TIMEOUT_SECONDS)
            ->withOptions([
                'stream' => true,
                'allow_redirects' => [
                    'max' => self::MAX_REDIRECTS,
                    'protocols' => ['http', 'https'],
                    // Chặn SSRF hai nhịp: máy chủ ngoài trả 302 về 169.254.169.254
                    // thì hop đó cũng phải qua cùng một cổng kiểm tra.
                    'on_redirect' => static function ($request, $response, UriInterface $uri): void {
                        SafeHttp::assertPublicUrl((string) $uri);
                    },
                ],
            ]);

        return $basicAuth === null ? $request : $request->withBasicAuth($basicAuth[0], $basicAuth[1]);
    }

    // Máy chủ khai sẵn kích thước thì từ chối trước khi tải một byte nào.
    private static function assertDeclaredSizeWithinLimit(Response $response): void
    {
        $declaredBytes = (int) $response->header('Content-Length');
        $maxBytes = FileUploadLimit::maxBytes();

        if ($declaredBytes > $maxBytes) {
            throw new RuntimeException("tệp khai {$declaredBytes} byte, vượt hạn mức {$maxBytes} byte");
        }
    }

    // write_response_body của bản gốc: ghi theo khối, dừng ngay khi vượt hạn mức.
    private static function streamToTemporaryFile(Response $response): string
    {
        $maxBytes = FileUploadLimit::maxBytes();
        $temporaryPath = tempnam(sys_get_temp_dir(), 'yona-attachment-');

        if ($temporaryPath === false) {
            throw new RuntimeException('không tạo được tệp tạm để tải đính kèm');
        }

        $handle = fopen($temporaryPath, 'wb');

        if ($handle === false) {
            throw new RuntimeException("không mở được tệp tạm {$temporaryPath}");
        }

        $body = $response->toPsrResponse()->getBody();
        $writtenBytes = 0;

        try {
            while (! $body->eof()) {
                $chunk = $body->read(self::CHUNK_BYTES);

                if ($chunk === '') {
                    break;
                }

                $writtenBytes += strlen($chunk);

                if ($writtenBytes > $maxBytes) {
                    throw new RuntimeException("tệp vượt hạn mức {$maxBytes} byte");
                }

                fwrite($handle, $chunk);
            }
        } finally {
            fclose($handle);
            $body->close();
        }

        return $temporaryPath;
    }

    private static function filenameFrom(string $url, string $contentType): string
    {
        $basename = basename((string) parse_url($url, PHP_URL_PATH));

        if (filled($basename) && str_contains($basename, '.')) {
            return $basename;
        }

        $extension = match (true) {
            str_starts_with($contentType, 'image/') => explode('/', $contentType)[1],
            str_starts_with($contentType, 'video/') => explode('/', $contentType)[1],
            str_starts_with($contentType, 'audio/') => explode('/', $contentType)[1],
            default => 'bin',
        };

        return 'media-'.uniqid().'.'.$extension;
    }
}
