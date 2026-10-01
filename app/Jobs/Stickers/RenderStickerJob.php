<?php

namespace App\Jobs\Stickers;

use App\Jobs\ApplicationJob;
use App\Models\Sticker;
use App\Services\Stickers\StickerFileJanitor;
use App\Services\Stickers\StickerFileLayout;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerRendererResolver;
use App\Services\Stickers\StickerVersion;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;
use UnexpectedValueException;

// Dựng sticker từ ảnh gốc đã lưu + thông số chỉnh của nó rồi ghi các tệp dựng
// (StickerFileLayout::renderedPaths) lên disk `stickers` theo hash nội dung. Hỏng ở bất kỳ bước nào:
// sticker `failed` kèm mã, không để lại tệp dở. Dựng lại (`refreshing`) sticker
// đã `ready` thì ghi đè đúng các đường dẫn cũ; hỏng thì chỉ báo lỗi, sticker vẫn
// dùng ảnh cũ. Chỉnh lại ảnh (`superseded` = bản đang dùng) dựng vào thư mục hash
// mới: xong thì dọn tệp bản cũ nếu không còn ai trỏ tới, hỏng thì sticker trở về
// bản cũ kèm mã lỗi. Disk `stickers` không ném lỗi khi ghi hỏng nên mọi lệnh ghi
// đều kiểm giá trị trả về.
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
        public readonly ?StickerVersion $superseded = null,
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
            $this->superseded === null ? $this->markFailed($outcome['failure']) : $this->restoreSuperseded($outcome['failure']);

            return;
        }

        $this->sticker->update([
            ...StickerFileLayout::renderedPaths($this->sticker->content_hash),
            ...$outcome,
            'status' => Sticker::STATUS_READY,
            'failure_code' => null,
        ]);

        if ($this->superseded !== null) {
            app(StickerFileJanitor::class)->releaseIfUnreferenced($this->superseded->contentHash);
        }
    }

    // Worker chỉ gọi hook này khi job bị giết giữa chừng (quá $timeout), vì
    // handle() tự bắt mọi lỗi của nó.
    public function failed(?Throwable $exception): void
    {
        if ($this->refreshing || $this->sticker->fresh()?->status !== Sticker::STATUS_PROCESSING) {
            return;
        }

        $this->superseded === null ? $this->markFailed(StickerRenderer::RENDER_TIMEOUT) : $this->restoreSuperseded(StickerRenderer::RENDER_TIMEOUT);
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
            ...array_fill_keys(array_keys(StickerFileLayout::renderedPaths($this->sticker->content_hash)), null),
            ...($released ? ['original_path' => null] : []),
            'status' => Sticker::STATUS_FAILED,
            'failure_code' => $failureCode,
        ]);
    }

    // Tệp của bản cũ còn nguyên (chỉ dọn khi bản mới xong) nên sticker dùng tiếp
    // được; mã lỗi giữ lại để người quản trị biết lượt chỉnh vừa rồi không thành.
    // Bộ đã có sticker khác mang hash cũ (tải lại đúng ảnh cũ trong lúc dựng) thì
    // không trả về được nữa: báo hỏng như lượt dựng thường.
    private function restoreSuperseded(string $failureCode): void
    {
        $failedHash = $this->sticker->content_hash;

        try {
            DB::transaction(fn () => $this->sticker->update([
                ...$this->superseded->attributes(),
                'status' => Sticker::STATUS_READY,
                'failure_code' => $failureCode,
            ]));
        } catch (UniqueConstraintViolationException) {
            $this->sticker->refresh();
            $this->markFailed($failureCode);

            return;
        }

        app(StickerFileJanitor::class)->releaseIfUnreferenced($failedHash, $this->sticker->getKey());
    }

    private function disk(): Filesystem
    {
        return Storage::disk(Sticker::DISK);
    }
}
