<?php

namespace App\Services\Stickers;

use Illuminate\Contracts\Process\ProcessResult;
use Illuminate\Process\Exceptions\ProcessTimedOutException;
use Illuminate\Support\Facades\Process;
use InvalidArgumentException;
use JsonException;
use Symfony\Component\Process\Exception\ProcessSignaledException;

// Driver gọi CLI services/sticker-renderer (sharp/libvips trên Node). CLI tự cắt
// theo --timeout-ms; phía PHP vẫn đặt timeout tiến trình và trần bộ nhớ ở tầng
// hệ điều hành vì ảnh động lớn giải mã ra hàng trăm MB ngoài tầm Node.
final class NodeStickerRenderer implements StickerRenderer
{
    private const CONFIG_KEY = 'yona.stickers';

    private const DRIVER_NAME = 'node';

    // Khoảng --timeout-ms, --size và --static-size mà CLI chấp nhận.
    private const MAX_TIMEOUT_SECONDS = 60;

    private const MIN_SIZE = 16;

    private const MAX_SIZE = 512;

    // Thời gian khởi động Node và ghi tệp ngoài phần dựng mà CLI tự đếm.
    private const PROCESS_GRACE_SECONDS = 3;

    private const PRLIMIT_LIMITER = 'prlimit';

    private const NO_LIMITER = 'none';

    private const EDIT_FILE_PREFIX = 'yona-sticker-edit-';

    private const COMMAND_NOT_RUNNABLE_EXIT_CODES = [126, 127];

    private const EMPTY_MASK_WARNING = 'mask_empty';

    // Lỗi của CLI → mã trung tính; mã lạ là dựng hỏng. PHP tự ghi tệp đầu vào và
    // đã kiểm edit, nên `usage` là lỗi môi trường còn `input_unreadable` là ảnh
    // mà sharp không giải mã được.
    private const CLI_FAILURES = [
        'timeout' => self::RENDER_TIMEOUT,
        'engine_unavailable' => self::RENDERER_UNAVAILABLE,
        'usage' => self::RENDERER_UNAVAILABLE,
        'output_failed' => self::RENDERER_UNAVAILABLE,
        'input_unreadable' => self::IMAGE_UNREADABLE,
        'unsupported_format' => self::IMAGE_UNREADABLE,
        'input_too_large' => self::IMAGE_TOO_LARGE,
        'too_many_frames' => self::TOO_MANY_FRAMES,
    ];

    public function render(string $imagePath, string $outputDirectory, array $edit, int $size, int $staticSize): array
    {
        $timeoutSeconds = $this->timeoutSeconds();
        $editPath = $edit === [] ? null : $this->writeEditFile($edit);

        if ($editPath === false) {
            return ['failure' => self::RENDERER_UNAVAILABLE];
        }

        try {
            $result = Process::timeout($timeoutSeconds + self::PROCESS_GRACE_SECONDS)->run([
                ...$this->memoryLimiterPrefix(),
                (string) config(self::CONFIG_KEY.'.renderers.'.self::DRIVER_NAME.'.binary'),
                (string) config(self::CONFIG_KEY.'.renderers.'.self::DRIVER_NAME.'.script'),
                $imagePath,
                $outputDirectory,
                '--size='.self::clampSize($size),
                '--static-size='.self::clampSize($staticSize),
                '--timeout-ms='.($timeoutSeconds * 1000),
                ...($editPath === null ? [] : ['--edit='.$editPath]),
            ]);
        } catch (ProcessTimedOutException) {
            return ['failure' => self::RENDER_TIMEOUT];
        } catch (ProcessSignaledException) {
            // V8 hoặc glib tự abort khi chạm trần bộ nhớ của prlimit.
            return ['failure' => self::RENDER_FAILED];
        } finally {
            if (is_string($editPath)) {
                @unlink($editPath);
            }
        }

        return $result->successful()
            ? $this->renderedFiles($result, $outputDirectory)
            : ['failure' => $this->failureCode($result)];
    }

    private static function clampSize(int $size): int
    {
        return max(self::MIN_SIZE, min($size, self::MAX_SIZE));
    }

    private function timeoutSeconds(): int
    {
        return max(1, min((int) config(self::CONFIG_KEY.'.timeout_seconds'), self::MAX_TIMEOUT_SECONDS));
    }

    /**
     * RLIMIT_DATA chặn được cả bộ nhớ libvips lẫn ArrayBuffer; RLIMIT_AS thì
     * không, vì V8 giữ chỗ hàng GB địa chỉ ảo.
     *
     * @return list<string>
     */
    private function memoryLimiterPrefix(): array
    {
        $limiter = (string) config(self::CONFIG_KEY.'.memory_limiter');
        $limitBytes = (int) config(self::CONFIG_KEY.'.memory_limit_mb') * 1024 * 1024;

        return match ($limiter) {
            self::PRLIMIT_LIMITER => ['prlimit', "--data={$limitBytes}"],
            self::NO_LIMITER => [],
            default => throw new InvalidArgumentException("Unknown sticker renderer memory limiter [{$limiter}]."),
        };
    }

    /**
     * @param  array<string, mixed>  $edit
     */
    private function writeEditFile(array $edit): string|false
    {
        $editPath = tempnam(sys_get_temp_dir(), self::EDIT_FILE_PREFIX);

        try {
            $written = $editPath !== false && file_put_contents($editPath, json_encode($edit, JSON_THROW_ON_ERROR)) !== false;
        } catch (JsonException) {
            $written = false;
        }

        if (! $written && $editPath !== false) {
            @unlink($editPath);
        }

        return $written ? $editPath : false;
    }

    /**
     * Đường dẫn ảnh lấy từ báo cáo của CLI, chỉ nhận tệp có thật nằm trong thư
     * mục đầu ra đã giao.
     *
     * @return array{image_path: string, static_path: string, width: int, height: int, frames: int, duration_ms: int}|array{failure: string}
     */
    private function renderedFiles(ProcessResult $result, string $outputDirectory): array
    {
        $summary = $this->lastJsonLine($result->output());
        $imagePath = $this->outputFile($summary['image'] ?? null, $outputDirectory);
        $staticPath = $this->outputFile($summary['static'] ?? null, $outputDirectory);
        $metrics = [
            'width' => $this->positiveInt($summary['width'] ?? null),
            'height' => $this->positiveInt($summary['height'] ?? null),
            'frames' => $this->positiveInt($summary['frames'] ?? null),
        ];
        $durationMs = $summary['durationMs'] ?? null;

        if ($imagePath === null || $staticPath === null || in_array(null, $metrics, true) || ! is_int($durationMs) || $durationMs < 0) {
            return ['failure' => self::RENDER_FAILED];
        }

        if (in_array(self::EMPTY_MASK_WARNING, (array) ($summary['warnings'] ?? []), true)) {
            return ['failure' => self::IMAGE_EMPTY];
        }

        return ['image_path' => $imagePath, 'static_path' => $staticPath, ...$metrics, 'duration_ms' => $durationMs];
    }

    private function outputFile(mixed $reportedPath, string $outputDirectory): ?string
    {
        if (! is_string($reportedPath) || ! is_file($reportedPath)) {
            return null;
        }

        return dirname((string) realpath($reportedPath)) === realpath($outputDirectory) ? $reportedPath : null;
    }

    private function positiveInt(mixed $value): ?int
    {
        return is_int($value) && $value > 0 ? $value : null;
    }

    private function failureCode(ProcessResult $result): string
    {
        if (in_array($result->exitCode(), self::COMMAND_NOT_RUNNABLE_EXIT_CODES, true)) {
            return self::RENDERER_UNAVAILABLE;
        }

        $cliError = $this->lastJsonLine($result->output())['error'] ?? null;

        return is_string($cliError) ? (self::CLI_FAILURES[$cliError] ?? self::RENDER_FAILED) : self::RENDER_FAILED;
    }

    /**
     * @return array<string, mixed>
     */
    private function lastJsonLine(string $output): array
    {
        $lines = preg_split('/\R/', trim($output)) ?: [];
        $decoded = json_decode((string) end($lines), true);

        return is_array($decoded) ? $decoded : [];
    }
}
