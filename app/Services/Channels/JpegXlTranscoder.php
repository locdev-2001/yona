<?php

namespace App\Services\Channels;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Throwable;

/**
 * Kênh có thể giao ảnh JPEG XL mà phần lớn trình duyệt chưa hiển thị được, nên ảnh
 * tải về được đổi sang JPEG trước khi vào kho. Dùng ffmpeg (bản có libjxl) vì máy
 * chạy Yona đã cài nó cho video và tin thoại.
 */
final class JpegXlTranscoder
{
    public const CONTENT_TYPE = 'image/jxl';

    public const OUTPUT_CONTENT_TYPE = 'image/jpeg';

    private const OUTPUT_EXTENSION = 'jpg';

    private const TIMEOUT_SECONDS = 30;

    // Thang chất lượng JPEG của ffmpeg: 2 là gần như không thấy khác ảnh gốc.
    private const JPEG_QUALITY = 2;

    /** Đường dẫn tệp JPEG tạm (bên gọi tự xoá), hoặc null khi máy không giải mã được. */
    public static function toJpeg(string $sourcePath): ?string
    {
        $outputPath = $sourcePath.'.'.self::OUTPUT_EXTENSION;

        try {
            $result = Process::timeout(self::TIMEOUT_SECONDS)->run([
                (string) config('yona.attachments.ffmpeg_path'),
                '-v', 'error',
                '-i', $sourcePath,
                '-frames:v', '1',
                '-q:v', (string) self::JPEG_QUALITY,
                '-y', $outputPath,
            ]);
        } catch (Throwable $exception) {
            $result = null;
            $failure = $exception->getMessage();
        }

        if ($result?->successful() && is_file($outputPath) && filesize($outputPath) > 0) {
            return $outputPath;
        }

        @unlink($outputPath);
        Log::warning('[CHANNEL] Không chuyển được ảnh JPEG XL sang JPEG: '.trim($failure ?? $result?->errorOutput() ?? ''));

        return null;
    }

    public static function jpegFilename(string $filename): string
    {
        return pathinfo($filename, PATHINFO_FILENAME).'.'.self::OUTPUT_EXTENSION;
    }
}
