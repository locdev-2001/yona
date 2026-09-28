<?php

namespace App\Jobs\Stickers;

use App\Jobs\ApplicationJob;
use App\Models\Sticker;
use App\Services\Stickers\StickerFileJanitor;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerRendererResolver;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;
use UnexpectedValueException;

// Dựng ảnh cho một sticker vừa upload rồi ghi ba tệp lên disk `stickers` theo
// hash nội dung. Hỏng ở bất kỳ bước nào: sticker `failed` kèm mã, không để lại
// tệp dở. Dựng lại (`refreshing`) sticker đã `ready` thì ghi đè đúng các đường
// dẫn cũ; hỏng thì chỉ báo lỗi, sticker vẫn dùng ảnh cũ. Disk `stickers` không ném lỗi khi ghi hỏng nên mọi lệnh ghi đều kiểm
// giá trị trả về.
class RenderStickerJob extends ApplicationJob
{
    public const STORAGE_WRITE_FAILED = 'storage_write_failed';

    // Hàng đợi riêng, supervisor-stickers một process (config/horizon.php).
    private const QUEUE = 'stickers';

    private const ANIMATION_FILE = 'anim.json';

    private const POSTER_FILE = 'poster.webp';

    private const STATIC_FILE = 'static.png';

    private const RENDER_OUTPUT_DIRECTORY = 'rendered';

    private const WORKSPACE_PREFIX = 'yona-sticker-render-';

    public int $tries = 1;

    // Dài hơn timeout tối đa của tiến trình render (60 giây cộng thời gian khởi động).
    public int $timeout = 90;

    public function __construct(
        public readonly Sticker $sticker,
        public readonly string $animationJson,
        public readonly bool $refreshing = false,
    ) {
        $this->onQueue(self::QUEUE);
    }

    /**
     * Đường dẫn tương đối trên disk `stickers`: {hash[0:2]}/{hash}/tệp.
     *
     * @return array{animation_path: string, poster_path: string, static_path: string}
     */
    public static function storagePaths(string $contentHash): array
    {
        $directory = substr($contentHash, 0, 2).'/'.$contentHash;

        return [
            'animation_path' => "{$directory}/".self::ANIMATION_FILE,
            'poster_path' => "{$directory}/".self::POSTER_FILE,
            'static_path' => "{$directory}/".self::STATIC_FILE,
        ];
    }

    public function handle(): void
    {
        $expectedStatus = $this->refreshing ? Sticker::STATUS_READY : Sticker::STATUS_PROCESSING;
        if ($this->sticker->status !== $expectedStatus) {
            return;
        }

        $workspace = sys_get_temp_dir().'/'.self::WORKSPACE_PREFIX.Str::uuid();

        try {
            $failure = $this->renderIntoStorage($workspace);
        } catch (Throwable $exception) {
            report($exception);
            $failure = StickerRenderer::RENDERER_UNAVAILABLE;
        } finally {
            File::deleteDirectory($workspace);
        }

        if ($this->refreshing) {
            $failure === null || report(new UnexpectedValueException("Dựng lại sticker {$this->sticker->getKey()} hỏng: {$failure}"));

            return;
        }

        $failure === null ? $this->markReady() : $this->markFailed($failure);
    }

    // Worker chỉ gọi hook này khi job bị giết giữa chừng (quá $timeout), vì
    // handle() tự bắt mọi lỗi của nó.
    public function failed(?Throwable $exception): void
    {
        if (! $this->refreshing && $this->sticker->fresh()?->status === Sticker::STATUS_PROCESSING) {
            $this->markFailed(StickerRenderer::RENDER_TIMEOUT);
        }
    }

    private function renderIntoStorage(string $workspace): ?string
    {
        $animationPath = "{$workspace}/".self::ANIMATION_FILE;
        File::ensureDirectoryExists($workspace);
        if (File::put($animationPath, $this->animationJson) === false) {
            return StickerRenderer::RENDERER_UNAVAILABLE;
        }

        $rendered = app(StickerRendererResolver::class)->renderer()->render($animationPath, "{$workspace}/".self::RENDER_OUTPUT_DIRECTORY);
        if (isset($rendered['failure'])) {
            return $rendered['failure'];
        }

        $contentsByColumn = [
            'animation_path' => $this->animationJson,
            'poster_path' => File::get($rendered['poster_path']),
            'static_path' => File::get($rendered['static_path']),
        ];
        foreach (self::storagePaths($this->sticker->content_hash) as $column => $path) {
            if (! $this->disk()->put($path, $contentsByColumn[$column])) {
                return self::STORAGE_WRITE_FAILED;
            }
        }

        return null;
    }

    private function markReady(): void
    {
        $this->sticker->update([
            ...self::storagePaths($this->sticker->content_hash),
            'status' => Sticker::STATUS_READY,
            'failure_code' => null,
        ]);
    }

    private function markFailed(string $failureCode): void
    {
        $this->discardStoredFiles();

        $this->sticker->update([
            'animation_path' => null,
            'poster_path' => null,
            'static_path' => null,
            'status' => Sticker::STATUS_FAILED,
            'failure_code' => $failureCode,
        ]);
    }

    private function discardStoredFiles(): void
    {
        app(StickerFileJanitor::class)->releaseIfUnreferenced($this->sticker->content_hash, $this->sticker->getKey());
    }

    private function disk(): Filesystem
    {
        return Storage::disk(Sticker::DISK);
    }
}
