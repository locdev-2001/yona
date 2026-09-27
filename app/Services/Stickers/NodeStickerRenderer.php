<?php

namespace App\Services\Stickers;

use Illuminate\Contracts\Process\ProcessResult;
use Illuminate\Process\Exceptions\ProcessTimedOutException;
use Illuminate\Support\Facades\Process;
use InvalidArgumentException;
use Symfony\Component\Process\Exception\ProcessSignaledException;

// Driver gọi CLI services/sticker-renderer (ThorVG wasm trên Node). CLI tự cắt
// theo --timeout-ms; phía PHP vẫn đặt timeout tiến trình và trần bộ nhớ ở tầng
// hệ điều hành vì wasm tự phình tới 2 GiB mà Node không chặn được.
final class NodeStickerRenderer implements StickerRenderer
{
    private const CONFIG_KEY = 'yona.stickers';

    private const DRIVER_NAME = 'node';

    // Trần --timeout-ms mà CLI chấp nhận.
    private const MAX_TIMEOUT_SECONDS = 60;

    // Thời gian khởi động Node và ghi tệp ngoài phần vẽ mà CLI tự đếm.
    private const PROCESS_GRACE_SECONDS = 3;

    private const PRLIMIT_LIMITER = 'prlimit';

    private const NO_LIMITER = 'none';

    private const COMMAND_NOT_RUNNABLE_EXIT_CODES = [126, 127];

    private const CLI_TIMEOUT_ERROR = 'timeout';

    // Lỗi của môi trường chạy, không phải của sticker.
    private const CLI_ENVIRONMENT_ERRORS = ['engine_unavailable', 'usage', 'input_unreadable', 'output_failed'];

    public function render(string $animationPath, string $outputDirectory): array
    {
        $timeoutSeconds = $this->timeoutSeconds();

        try {
            $result = Process::timeout($timeoutSeconds + self::PROCESS_GRACE_SECONDS)->run([
                ...$this->memoryLimiterPrefix(),
                (string) config(self::CONFIG_KEY.'.renderers.'.self::DRIVER_NAME.'.binary'),
                (string) config(self::CONFIG_KEY.'.renderers.'.self::DRIVER_NAME.'.script'),
                $animationPath,
                $outputDirectory,
                '--timeout-ms='.($timeoutSeconds * 1000),
            ]);
        } catch (ProcessTimedOutException) {
            return ['failure' => self::RENDER_TIMEOUT];
        } catch (ProcessSignaledException) {
            // V8 tự abort khi chạm trần bộ nhớ của prlimit.
            return ['failure' => self::RENDER_FAILED];
        }

        return $result->successful()
            ? $this->renderedFiles($result, $outputDirectory)
            : ['failure' => $this->failureCode($result)];
    }

    private function timeoutSeconds(): int
    {
        return max(1, min((int) config(self::CONFIG_KEY.'.timeout_seconds'), self::MAX_TIMEOUT_SECONDS));
    }

    /**
     * RLIMIT_DATA chặn được cả bộ nhớ wasm lẫn ArrayBuffer; RLIMIT_AS thì không,
     * vì V8 giữ chỗ hàng GB địa chỉ ảo cho mỗi vùng nhớ wasm.
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
     * Đường dẫn ảnh lấy từ báo cáo của CLI, chỉ nhận tệp có thật nằm trong
     * thư mục đầu ra đã giao.
     *
     * @return array{poster_path: string, static_path: string, poster_frame: int|float}|array{failure: string}
     */
    private function renderedFiles(ProcessResult $result, string $outputDirectory): array
    {
        $summary = $this->lastJsonLine($result->output());
        $posterPath = $this->outputFile($summary['poster'] ?? null, $outputDirectory);
        $staticPath = $this->outputFile($summary['static'] ?? null, $outputDirectory);
        $posterFrame = $summary['frame'] ?? null;

        if ((! is_int($posterFrame) && ! is_float($posterFrame)) || $posterPath === null || $staticPath === null) {
            return ['failure' => self::RENDER_FAILED];
        }

        return ['poster_path' => $posterPath, 'static_path' => $staticPath, 'poster_frame' => $posterFrame];
    }

    private function outputFile(mixed $reportedPath, string $outputDirectory): ?string
    {
        if (! is_string($reportedPath) || ! is_file($reportedPath)) {
            return null;
        }

        return dirname((string) realpath($reportedPath)) === realpath($outputDirectory) ? $reportedPath : null;
    }

    private function failureCode(ProcessResult $result): string
    {
        if (in_array($result->exitCode(), self::COMMAND_NOT_RUNNABLE_EXIT_CODES, true)) {
            return self::RENDERER_UNAVAILABLE;
        }

        $cliError = $this->lastJsonLine($result->output())['error'] ?? null;

        return match (true) {
            $cliError === self::CLI_TIMEOUT_ERROR => self::RENDER_TIMEOUT,
            in_array($cliError, self::CLI_ENVIRONMENT_ERRORS, true) => self::RENDERER_UNAVAILABLE,
            default => self::RENDER_FAILED,
        };
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
