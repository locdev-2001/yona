<?php

use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\LottieMinifier;
use App\Services\Stickers\NodeStickerRenderer;
use App\Services\Stickers\StickerRenderer;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Process\Exception\ProcessTimedOutException as SymfonyProcessTimedOutException;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process as SymfonyProcess;

function prlimitAvailable(): bool
{
    return is_executable('/usr/bin/prlimit') || is_executable('/bin/prlimit');
}

function nodeAvailable(): bool
{
    return (new ExecutableFinder)->find('node') !== null;
}

beforeEach(function () {
    $this->workspace = sys_get_temp_dir().'/sticker-renderer-test-'.bin2hex(random_bytes(6));
    File::ensureDirectoryExists($this->workspace);
    $this->animationPath = "{$this->workspace}/anim.json";
    $this->outputDirectory = "{$this->workspace}/rendered";
    $this->writeRenderedFiles = function (): void {
        File::ensureDirectoryExists($this->outputDirectory);
        File::put("{$this->outputDirectory}/poster.webp", 'webp');
        File::put("{$this->outputDirectory}/static.png", 'png');
    };

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

it('runs the CLI under a data-segment limit and a process timeout above the CLI timeout', function () {
    Process::fake(['*' => Process::result('{"error":"render_failed"}', exitCode: 1)]);

    (new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory);

    Process::assertRan(fn (PendingProcess $process) => $process->command === [
        'prlimit', '--data='.(256 * 1024 * 1024),
        'node', '/opt/renderer/render.mjs', $this->animationPath, $this->outputDirectory, '--timeout-ms=7000',
    ] && $process->timeout === 7 + 3);
});

it('runs the CLI directly when the memory limiter is turned off', function () {
    config(['yona.stickers.memory_limiter' => 'none']);
    Process::fake(['*' => Process::result('{"error":"render_failed"}', exitCode: 1)]);

    (new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory);

    Process::assertRan(fn (PendingProcess $process) => $process->command[0] === 'node');
});

it('refuses an unknown memory limiter instead of running unbounded', function () {
    config(['yona.stickers.memory_limiter' => 'cgroup-magic']);
    Process::fake();

    expect(fn () => (new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory))
        ->toThrow(InvalidArgumentException::class);
    Process::assertNothingRan();
});

it('keeps the CLI timeout inside the range the CLI accepts', function (int $configuredSeconds, string $expectedOption) {
    config(['yona.stickers.timeout_seconds' => $configuredSeconds]);
    Process::fake(['*' => Process::result('{"error":"render_failed"}', exitCode: 1)]);

    (new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory);

    Process::assertRan(fn (PendingProcess $process) => end($process->command) === $expectedOption);
})->with([
    'zero' => [0, '--timeout-ms=1000'],
    'above the CLI ceiling' => [600, '--timeout-ms=60000'],
]);

it('returns the files the CLI reports and the absolute poster frame', function () {
    File::ensureDirectoryExists($this->outputDirectory);
    File::put("{$this->outputDirectory}/frame-45.webp", 'webp');
    File::put("{$this->outputDirectory}/frame-45.png", 'png');
    Process::fake(['*' => Process::result("warming up\n".json_encode([
        'poster' => "{$this->outputDirectory}/frame-45.webp", 'static' => "{$this->outputDirectory}/frame-45.png", 'frame' => 45, 'width' => 512, 'height' => 512, 'frames' => 60, 'duration' => 2, 'warnings' => [],
    ]))]);

    expect((new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory))->toBe([
        'poster_path' => "{$this->outputDirectory}/frame-45.webp",
        'static_path' => "{$this->outputDirectory}/frame-45.png",
        'poster_frame' => 45,
    ]);
});

it('treats a success report without the files on disk as a failed render', function (Closure $report) {
    ($this->writeRenderedFiles)();
    Process::fake(['*' => Process::result(json_encode([...$report($this->outputDirectory, $this->workspace), 'frame' => 45]))]);

    expect((new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory))
        ->toBe(['failure' => StickerRenderer::RENDER_FAILED]);
})->with([
    'files missing' => [fn (string $output) => ['poster' => "{$output}/missing.webp", 'static' => "{$output}/missing.png"]],
    'paths left out' => [fn () => []],
    'files outside the output directory' => [function (string $output, string $workspace) {
        File::put("{$workspace}/stray.webp", 'webp');
        File::put("{$workspace}/stray.png", 'png');

        return ['poster' => "{$output}/../stray.webp", 'static' => "{$workspace}/stray.png"];
    }],
]);

it('maps CLI failures to stable failure codes', function (string $output, int $exitCode, string $expectedFailure) {
    Process::fake(['*' => Process::result($output, exitCode: $exitCode)]);

    expect((new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory))
        ->toBe(['failure' => $expectedFailure]);
})->with([
    'CLI timeout' => ['{"error":"timeout"}', 1, StickerRenderer::RENDER_TIMEOUT],
    'engine missing' => ['{"error":"engine_unavailable"}', 1, StickerRenderer::RENDERER_UNAVAILABLE],
    'cannot write output' => ['{"error":"output_failed"}', 1, StickerRenderer::RENDERER_UNAVAILABLE],
    'ThorVG refused the file' => ['{"error":"load_failed"}', 1, StickerRenderer::RENDER_FAILED],
    'drawing failed' => ['{"error":"render_failed"}', 1, StickerRenderer::RENDER_FAILED],
    'crash without a report' => ['', 134, StickerRenderer::RENDER_FAILED],
    'binary not found' => ['', 127, StickerRenderer::RENDERER_UNAVAILABLE],
    'binary not executable' => ['', 126, StickerRenderer::RENDERER_UNAVAILABLE],
]);

it('reports a failed render when the process dies from a signal', function () {
    Process::fake(fn () => (new SymfonyProcess(['sh', '-c', 'kill -ABRT $$']))->run());

    expect((new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory))
        ->toBe(['failure' => StickerRenderer::RENDER_FAILED]);
});

it('reports a timeout when the process outlives its deadline', function () {
    Process::fake(fn () => throw new SymfonyProcessTimedOutException(new SymfonyProcess(['true']), SymfonyProcessTimedOutException::TYPE_GENERAL));

    expect((new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory))
        ->toBe(['failure' => StickerRenderer::RENDER_TIMEOUT]);
});

describe('with the real renderer', function () {
    beforeEach(function () {
        config([
            'yona.stickers.renderers.node.script' => base_path('services/sticker-renderer/src/render.mjs'),
            'yona.stickers.timeout_seconds' => 10,
            'yona.stickers.memory_limiter' => prlimitAvailable() ? 'prlimit' : 'none',
            'yona.stickers.memory_limit_mb' => 384,
        ]);
        $validator = new LottieDocumentValidator;
        $this->writeMinifiedFixture = function (string $fixture) use ($validator): void {
            $inspection = $validator->inspect(file_get_contents(base_path("tests/Fixtures/stickers/{$fixture}")));
            File::put($this->animationPath, (new LottieMinifier)->minify($inspection['document']));
        };
    });

    it('renders a minified sticker to a 256px poster and a 512px still at the poster marker', function () {
        ($this->writeMinifiedFixture)('ball-with-poster-marker.tgs');

        $rendered = (new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory);

        expect($rendered)->toMatchArray(['poster_frame' => 45])
            ->and(getimagesize($rendered['poster_path']))->toMatchArray([0 => 256, 1 => 256, 'mime' => 'image/webp'])
            ->and(getimagesize($rendered['static_path']))->toMatchArray([0 => 512, 1 => 512, 'mime' => 'image/png']);
    });

    it('fails the render instead of growing past the memory limit', function () {
        ($this->writeMinifiedFixture)('ball-with-poster-marker.json');
        config(['yona.stickers.memory_limit_mb' => 96]);

        expect((new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory))
            ->toBe(['failure' => StickerRenderer::RENDER_FAILED])
            ->and(File::exists("{$this->outputDirectory}/static.png"))->toBeFalse();
    })->skip(fn () => ! prlimitAvailable(), 'Máy này không có prlimit.');
})->group('renderer')->skip(
    fn () => ! is_dir(base_path('services/sticker-renderer/node_modules/@thorvg/lottie-player')),
    'Chưa cài services/sticker-renderer (corepack pnpm --dir services/sticker-renderer install).',
);

// Chỉ cần tiến trình thật, không cần ThorVG: chạy được cả khi chưa cài renderer.
describe('with a real process', function () {
    beforeEach(function () {
        config(['yona.stickers.memory_limiter' => prlimitAvailable() ? 'prlimit' : 'none']);
        File::put($this->animationPath, '{}');
    });

    it('kills a renderer that hangs past the process deadline', function () {
        $hangingScript = "{$this->workspace}/hang.mjs";
        File::put($hangingScript, 'setInterval(() => {}, 1000);');
        config(['yona.stickers.renderers.node.script' => $hangingScript, 'yona.stickers.timeout_seconds' => 1]);

        $startedAt = microtime(true);
        $rendered = (new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory);

        expect($rendered)->toBe(['failure' => StickerRenderer::RENDER_TIMEOUT])
            ->and(microtime(true) - $startedAt)->toBeLessThan(10);
    })->skip(fn () => ! nodeAvailable(), 'Máy này không có node.');

    it('reports the renderer as unavailable when the binary is missing', function () {
        config(['yona.stickers.renderers.node.binary' => '/nonexistent/node-binary']);

        expect((new NodeStickerRenderer)->render($this->animationPath, $this->outputDirectory))
            ->toBe(['failure' => StickerRenderer::RENDERER_UNAVAILABLE]);
    });
});
