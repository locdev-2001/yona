<?php

namespace App\Services\Channels;

use App\Models\Attachment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Thay cho gem Down của Chatwoot: tải một tệp từ URL của nhà cung cấp rồi trả về
 * mảng thuộc tính cho Attachment. Mọi kênh dùng chung một đường tải.
 *
 * @phpstan-type AttachmentAttributes array<string, mixed>
 */
class RemoteAttachmentDownloader
{
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
        try {
            $request = Http::withHeaders($headers)->timeout(30);

            if ($basicAuth !== null) {
                $request = $request->withBasicAuth($basicAuth[0], $basicAuth[1]);
            }

            $response = $request->get($url);
        } catch (Throwable $exception) {
            Log::warning('[CHANNEL] Không tải được tệp đính kèm: '.$exception->getMessage());

            return null;
        }

        if (! $response->successful()) {
            Log::warning("[CHANNEL] Không tải được tệp đính kèm ({$response->status()}): {$url}");

            return null;
        }

        $contentType = $response->header('Content-Type') ?: 'application/octet-stream';
        $contentType = trim(explode(';', $contentType)[0]);

        return Attachment::storeContents(
            $response->body(),
            $filename ?: self::filenameFrom($url, $contentType),
            $contentType,
            $accountId,
        );
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
