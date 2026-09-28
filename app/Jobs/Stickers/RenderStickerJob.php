<?php

namespace App\Jobs\Stickers;

use App\Jobs\ApplicationJob;
use App\Models\Sticker;
use App\Services\Stickers\StickerFileJanitor;
use App\Services\Stickers\StickerFileLayout;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerRendererResolver;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;
use UnexpectedValueException;

// Dựng sticker từ ảnh gốc đã lưu + thông số chỉnh của nó rồi ghi `sticker.webp`
// và `static.png` lên disk `stickers` theo hash nội dung. Hỏng ở bất kỳ bước nào:
// sticker `failed` kèm mã, không để lại tệp dở. Dựng lại (`refreshing`) sticker
// đã `ready` thì ghi đè đúng các đường dẫn cũ; hỏng thì chỉ báo lỗi, sticker vẫn
// dùng ảnh cũ. Disk `stickers` không ném lỗi khi ghi hỏng nên mọi lệnh ghi đều
// kiểm giá trị trả về.
class RenderStickerJob extends ApplicationJob
{
    public const STORAGE_WRITE_FAILED = 'storage_write_failed';

    public const ORIGINAL_MISSING = 'original_missing';

    // Hàng đợi riêng, supervisor-stickers một process (config/horizon.php).
    private const QUEUE = 'stickers';

    private const RENDER_OUTPUT_DIRECTORY = 'rendered';

    private const WORKSPACE_PREFIX = 'yona-sticker-render-';

    public int $tries = 1;

    // Dài hơn timeout tối đa của tiến trình dựng (60 giây cộng thời gian khởi động).
    public int $timeout = 90;

    public function __construct(
        public readonly Sticker $sticker,
        public readonly bool $refreshing = false,
    ) {
        $this->onQueue(self::QUEUE);
    }

    public function handle(): void
    {
        $expectedStatus = $this->refreshing ? Sticker::STATUS_READY : Sticker::STATUS_PROCESSING;
        if ($this->sticker->status !== $expectedStatus) {
            return;
        }

        $workspace = sys_get_temp_dir().'/'.self::WORKSPACE_PREFIX.Str::uuid();

        try {
            $outcome = $this->renderIntoStorage($workspace);
        } catch (Throwable $exception) {
            report($exception);
            $outcome = ['failure' => StickerRenderer::RENDERER_UNAVAILABLE];
        } finally {
            File::deleteDirectory($workspace);
        }

        if (isset($outcome['failure']) && $this->refreshing) {
            report(new UnexpectedValueException("Dựng lại sticker {$this->sticker->getKey()} hỏng: {$outcome['failure']}"));

            return;
        }

        if (isset($outcome['failure'])) {
            $this->markFailed($outcome['failure']);

            return;
        }

        $this->sticker->update([
            ...StickerFileLayout::renderedPaths($this->sticker->content_hash),
            ...$outcome,
            'status' => Sticker::STATUS_READY,
            'failure_code' => null,
        ]);
    }

    // Worker chỉ gọi hook này khi job bị giết giữa chừng (quá $timeout), vì
    // handle() tự bắt mọi lỗi của nó.
    public function failed(?Throwable $exception): void
    {
        if (! $this->refreshing && $this->sticker->fresh()?->status === Sticker::STATUS_PROCESSING) {
            $this->markFailed(StickerRenderer::RENDER_TIMEOUT);
        }
    }

    /**
     * @return array{width: int, height: int, frame_count: int, duration_ms: int, byte_size: int}|array{failure: string}
     */
    private function renderIntoStorage(string $workspace): array
    {
        $originalPath = $this->sticker->original_path;
        $original = $originalPath === null ? null : $this->disk()->get($originalPath);
        if ($original === null) {
            return ['failure' => self::ORIGINAL_MISSING];
        }

        $inputPath = "{$workspace}/".basename($originalPath);
        File::ensureDirectoryExists($workspace);
        if (File::put($inputPath, $original) === false) {
            return ['failure' => StickerRenderer::RENDERER_UNAVAILABLE];
        }

        $rendered = app(StickerRendererResolver::class)->renderer()->render(
            $inputPath,
            "{$workspace}/".self::RENDER_OUTPUT_DIRECTORY,
            $this->sticker->edit_params ?? [],
            Sticker::imageSize(),
            Sticker::outboundImageSize(),
        );
        if (isset($rendered['failure'])) {
            return ['failure' => $rendered['failure']];
        }

        foreach (StickerFileLayout::renderedPaths($this->sticker->content_hash) as $column => $path) {
            if (! $this->disk()->put($path, File::get($rendered[$column]))) {
                return ['failure' => self::STORAGE_WRITE_FAILED];
            }
        }

        return [
            'width' => $rendered['width'],
            'height' => $rendered['height'],
            'frame_count' => $rendered['frames'],
            'duration_ms' => $rendered['duration_ms'],
            'byte_size' => (int) File::size($rendered['image_path']),
        ];
    }

    // Ảnh gốc nằm chung thư mục hash nên bị dọn cùng: tải lại ảnh là dựng lại được.
    private function markFailed(string $failureCode): void
    {
        $released = app(StickerFileJanitor::class)->releaseIfUnreferenced($this->sticker->content_hash, $this->sticker->getKey());

        $this->sticker->update([
            'image_path' => null,
            'static_path' => null,
            ...($released ? ['original_path' => null] : []),
            'status' => Sticker::STATUS_FAILED,
            'failure_code' => $failureCode,
        ]);
    }

    private function disk(): Filesystem
    {
        return Storage::disk(Sticker::DISK);
    }
}
