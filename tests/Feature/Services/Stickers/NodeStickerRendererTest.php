<?php

use App\Services\Stickers\NodeStickerRenderer;
use App\Services\Stickers\StickerRenderer;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Process\Exception\ProcessTimedOutException as SymfonyProcessTimedOutException;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process as SymfonyProcess;
use Tests\Support\YonaStickers;

function prlimitAvailable(): bool
{
    return is_executable('/usr/bin/prlimit') || is_executable('/bin/prlimit');
}

function nodeAvailable(): bool
{
    return (new ExecutableFinder)->find('node') !== null;
}

/** @param array<string, mixed> $overrides */
function rendererSummary(string $outputDirectory, array $overrides = []): string
{
    return json_encode([
        'image' => "{$outputDirectory}/sticker.webp",
        'static' => "{$outputDirectory}/static.png",
        'gif' => "{$outputDirectory}/sticker.gif",
        'width' => 64,
        'height' => 64,
        'frames' => 1,
        'durationMs' => 0,
        'warnings' => [],
        ...$overrides,
    ]);
}

beforeEach(function () {
    $this->workspace = sys_get_temp_dir().'/sticker-renderer-test-'.bin2hex(random_bytes(6));
    File::ensureDirectoryExists($this->workspace);
    $this->imagePath = "{$this->workspace}/original.png";
    $this->outputDirectory = "{$this->workspace}/rendered";
    $this->writeRenderedFiles = function (): void {
        File::ensureDirectoryExists($this->outputDirectory);
        File::put("{$this->outputDirectory}/sticker.webp", 'webp');
        File::put("{$this->outputDirectory}/static.png", 'png');
        File::put("{$this->outputDirectory}/sticker.gif", 'gif');
    };
    $this->render = fn (array $edit = [], int $size = 64, int $staticSize = 128) => (new NodeStickerRenderer)->render($this->imagePath, $this->outputDirectory, $edit, $size, $staticSize);

    config([
        'yona.stickers.renderers.node.binary' => 'node',
        'yona.stickers.renderers.node.script' => '/opt/renderer/render.mjs',
        'yona.stickers.timeout_seconds' => 7,
        'yona.stickers.memory_limiter' => 'prlimit',
        'yona.stickers.memory_limit_mb' => 256,
    ]);
});

afterEach(function () {
    File::deleteDirectory($this->workspace);
});

it('chạy CLI dưới trần bộ nhớ dữ liệu, timeout tiến trình dài hơn timeout của CLI, không có --edit khi không chỉnh', function () {
    Process::fake(['*' => Process::result('{"error":"render_failed"}', exitCode: 1)]);

    ($this->render)();

    Process::assertRan(fn (PendingProcess $process) => $process->command === [
        'prlimit', '--data='.(256 * 1024 * 1024),
        'node', '/opt/renderer/render.mjs', $this->imagePath, $this->outputDirectory, '--size=64', '--static-size=128', '--timeout-ms=7000',
    ] && $process->timeout === 7 + 3);
});

it('ghi thông số chỉnh ra tệp tạm cho --edit rồi xoá tệp đó sau lượt dựng', function () {
    $edit = ['crop' => ['x' => 0.1, 'y' => 0.05, 'w' => 0.8, 'h' => 0.8], 'removeBackground' => true, 'edits' => []];
    $seenEdit = null;
    $editPath = null;
    Process::fake(function (PendingProcess $process) use (&$seenEdit, &$editPath) {
        $editOption = collect($process->command)->first(fn (string $argument) => str_starts_with($argument, '--edit='));
        $editPath = substr((string) $editOption, strlen('--edit='));
        $seenEdit = json_decode((string) file_get_contents($editPath), true);

        return Process::result('{"error":"render_failed"}', exitCode: 1);
    });

    ($this->render)($edit);

    expect($seenEdit)->toBe($edit)
        ->and(file_exists((string) $editPath))->toBeFalse();
});

it('chạy thẳng CLI khi tắt giới hạn bộ nhớ', function () {
    config(['yona.stickers.memory_limiter' => 'none']);
    Process::fake(['*' => Process::result('{"error":"render_failed"}', exitCode: 1)]);

    ($this->render)();

    Process::assertRan(fn (PendingProcess $process) => $process->command[0] === 'node');
});

it('từ chối bộ giới hạn bộ nhớ lạ thay vì chạy không giới hạn', function () {
    config(['yona.stickers.memory_limiter' => 'cgroup-magic']);
    Process::fake();

    expect(fn () => ($this->render)())->toThrow(InvalidArgumentException::class);
    Process::assertNothingRan();
});

it('giữ timeout và cạnh sticker trong khoảng CLI nhận', function (int $timeoutSeconds, int $size, string $expectedTimeout, string $expectedSize) {
    config(['yona.stickers.timeout_seconds' => $timeoutSeconds]);
    Process::fake(['*' => Process::result('{"error":"render_failed"}', exitCode: 1)]);

    ($this->render)([], $size);

    Process::assertRan(fn (PendingProcess $process) => in_array($expectedTimeout, $process->command, true) && in_array($expectedSize, $process->command, true));
})->with([
    'bằng 0' => [0, 0, '--timeout-ms=1000', '--size=16'],
    'vượt trần' => [600, 4096, '--timeout-ms=60000', '--size=512'],
    'trong khoảng' => [10, 96, '--timeout-ms=10000', '--size=96'],
]);

it('trả tệp và số đo CLI báo về', function () {
    ($this->writeRenderedFiles)();
    Process::fake(['*' => Process::result("warming up\n".rendererSummary($this->outputDirectory, ['frames' => 12, 'durationMs' => 960]))]);

    expect(($this->render)())->toBe([
        'image_path' => "{$this->outputDirectory}/sticker.webp",
        'static_path' => "{$this->outputDirectory}/static.png",
        'gif_path' => "{$this->outputDirectory}/sticker.gif",
        'width' => 64,
        'height' => 64,
        'frames' => 12,
        'duration_ms' => 960,
    ]);
});

it('xoá nền hết sạch (cảnh báo mask_empty) là sticker rỗng, không nhận', function () {
    ($this->writeRenderedFiles)();
    Process::fake(['*' => Process::result(rendererSummary($this->outputDirectory, ['warnings' => ['mask_empty']]))]);

    expect(($this->render)())->toBe(['failure' => StickerRenderer::IMAGE_EMPTY]);
});

it('báo thành công mà thiếu tệp hoặc số đo thì tính là dựng hỏng', function (Closure $report) {
    ($this->writeRenderedFiles)();
    Process::fake(['*' => Process::result($report($this->outputDirectory, $this->workspace))]);

    expect(($this->render)())->toBe(['failure' => StickerRenderer::RENDER_FAILED]);
})->with([
    'thiếu tệp' => [fn (string $output) => rendererSummary($output, ['image' => "{$output}/missing.webp"])],
    'thiếu GIF' => [fn (string $output) => rendererSummary($output, ['gif' => null])],
    'không báo đường dẫn' => [fn () => json_encode(['width' => 64, 'height' => 64, 'frames' => 1, 'durationMs' => 0])],
    'tệp nằm ngoài thư mục đầu ra' => [function (string $output, string $workspace) {
        File::put("{$workspace}/stray.webp", 'webp');

        return rendererSummary($output, ['image' => "{$output}/../stray.webp"]);
    }],
    'thiếu số khung' => [fn (string $output) => rendererSummary($output, ['frames' => null])],
    'thời lượng âm' => [fn (string $output) => rendererSummary($output, ['durationMs' => -1])],
]);

it('đổi lỗi của CLI thành mã ổn định', function (string $output, int $exitCode, string $expectedFailure) {
    Process::fake(['*' => Process::result($output, exitCode: $exitCode)]);

    expect(($this->render)())->toBe(['failure' => $expectedFailure]);
})->with([
    'CLI hết giờ' => ['{"error":"timeout"}', 1, StickerRenderer::RENDER_TIMEOUT],
    'thiếu engine' => ['{"error":"engine_unavailable"}', 1, StickerRenderer::RENDERER_UNAVAILABLE],
    'sai cách gọi' => ['{"error":"usage"}', 1, StickerRenderer::RENDERER_UNAVAILABLE],
    'không ghi được đầu ra' => ['{"error":"output_failed"}', 1, StickerRenderer::RENDERER_UNAVAILABLE],
    'ảnh hỏng' => ['{"error":"input_unreadable"}', 1, StickerRenderer::IMAGE_UNREADABLE],
    'định dạng lạ' => ['{"error":"unsupported_format"}', 1, StickerRenderer::IMAGE_UNREADABLE],
    'ảnh quá lớn' => ['{"error":"input_too_large"}', 1, StickerRenderer::IMAGE_TOO_LARGE],
    'quá nhiều khung' => ['{"error":"too_many_frames"}', 1, StickerRenderer::TOO_MANY_FRAMES],
    'dựng hỏng' => ['{"error":"render_failed"}', 1, StickerRenderer::RENDER_FAILED],
    'mã lạ' => ['{"error":"something_new"}', 1, StickerRenderer::RENDER_FAILED],
    'sập không báo' => ['', 134, StickerRenderer::RENDER_FAILED],
    'không thấy node' => ['', 127, StickerRenderer::RENDERER_UNAVAILABLE],
    'node không chạy được' => ['', 126, StickerRenderer::RENDERER_UNAVAILABLE],
]);

it('tiến trình chết vì tín hiệu thì báo dựng hỏng', function () {
    Process::fake(fn () => (new SymfonyProcess(['sh', '-c', 'kill -ABRT $$']))->run());

    expect(($this->render)())->toBe(['failure' => StickerRenderer::RENDER_FAILED]);
});

it('tiến trình quá hạn thì báo hết giờ', function () {
    Process::fake(fn () => throw new SymfonyProcessTimedOutException(new SymfonyProcess(['true']), SymfonyProcessTimedOutException::TYPE_GENERAL));

    expect(($this->render)())->toBe(['failure' => StickerRenderer::RENDER_TIMEOUT]);
});

describe('với trình dựng thật', function () {
    beforeEach(function () {
        config([
            'yona.stickers.renderers.node.script' => base_path('services/sticker-renderer/src/render.mjs'),
            'yona.stickers.timeout_seconds' => 10,
            'yona.stickers.memory_limiter' => prlimitAvailable() ? 'prlimit' : 'none',
            'yona.stickers.memory_limit_mb' => 512,
        ]);
    });

    it('cắt, xoá nền và dựng WebP cạnh sticker + PNG cạnh kênh ngoài', function () {
        File::put($this->imagePath, YonaStickers::png(300));

        $rendered = ($this->render)(['crop' => ['x' => 0.1, 'y' => 0.1, 'w' => 0.8, 'h' => 0.8], 'tolerance' => 12], 48, 96);

        expect($rendered)->toMatchArray(['width' => 48, 'height' => 48, 'frames' => 1, 'duration_ms' => 0])
            ->and(getimagesize($rendered['image_path']))->toMatchArray([0 => 48, 1 => 48, 'mime' => 'image/webp'])
            ->and(getimagesize($rendered['static_path']))->toMatchArray([0 => 96, 1 => 96, 'mime' => 'image/png']);
    });

    it('GIF động ra WebP động giữ số khung và thời lượng', function () {
        File::copy(base_path(YonaStickers::ANIMATED_FIXTURE), $this->imagePath);

        expect(($this->render)())->toMatchArray(['width' => 64, 'height' => 64, 'frames' => 4, 'duration_ms' => 480]);
    });

    it('tệp không phải ảnh thì báo ảnh không đọc được', function () {
        File::put($this->imagePath, 'không phải ảnh');

        expect(($this->render)())->toBe(['failure' => StickerRenderer::IMAGE_UNREADABLE]);
    });

    // Dưới trần, tuỳ lượng thiếu mà tiến trình abort hoặc treo tới khi bị cắt.
    it('dựng hỏng thay vì phình quá trần bộ nhớ', function () {
        File::copy(base_path(YonaStickers::ANIMATED_FIXTURE), $this->imagePath);
        config(['yona.stickers.memory_limit_mb' => 64, 'yona.stickers.timeout_seconds' => 2]);

        expect(($this->render)()['failure'] ?? null)->toBeIn([StickerRenderer::RENDER_FAILED, StickerRenderer::RENDER_TIMEOUT])
            ->and(File::exists("{$this->outputDirectory}/static.png"))->toBeFalse();
    })->skip(fn () => ! prlimitAvailable(), 'Máy này không có prlimit.');
})->group('renderer')->skip(
    fn () => ! is_dir(base_path('services/sticker-renderer/node_modules/sharp')),
    'Chưa cài services/sticker-renderer (corepack pnpm --dir services/sticker-renderer install).',
);

// Chỉ cần tiến trình thật, không cần sharp: chạy được cả khi chưa cài renderer.
describe('với tiến trình thật', function () {
    beforeEach(function () {
        config(['yona.stickers.memory_limiter' => prlimitAvailable() ? 'prlimit' : 'none']);
        File::put($this->imagePath, 'png');
    });

    it('giết trình dựng treo quá hạn tiến trình', function () {
        $hangingScript = "{$this->workspace}/hang.mjs";
        File::put($hangingScript, 'setInterval(() => {}, 1000);');
        config(['yona.stickers.renderers.node.script' => $hangingScript, 'yona.stickers.timeout_seconds' => 1]);

        $startedAt = microtime(true);
        $rendered = ($this->render)();

        expect($rendered)->toBe(['failure' => StickerRenderer::RENDER_TIMEOUT])
            ->and(microtime(true) - $startedAt)->toBeLessThan(10);
    })->skip(fn () => ! nodeAvailable(), 'Máy này không có node.');

    it('báo trình dựng chưa sẵn sàng khi không có node', function () {
        config(['yona.stickers.renderers.node.binary' => '/nonexistent/node-binary']);

        expect(($this->render)())->toBe(['failure' => StickerRenderer::RENDERER_UNAVAILABLE]);
    });
});

it('truyền cạnh ảnh gửi kênh ngoài vào --static-size, kẹp trong khoảng CLI nhận', function (int $staticSize, string $expected) {
    Process::fake(['*' => Process::result('{"error":"render_failed"}', exitCode: 1)]);

    ($this->render)([], 64, $staticSize);

    Process::assertRan(fn (PendingProcess $process) => in_array($expected, $process->command, true));
})->with([
    'mặc định 128' => [128, '--static-size=128'],
    'dưới sàn' => [2, '--static-size=16'],
    'vượt trần' => [2048, '--static-size=512'],
]);
