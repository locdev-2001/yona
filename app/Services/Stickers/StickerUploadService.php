<?php

namespace App\Services\Stickers;

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use App\Models\StickerPack;
use Closure;
use finfo;
use HashContext;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

// Lối vào duy nhất cho mọi lượt dựng sticker từ ảnh gốc (Super Admin lẫn tenant):
// tải ảnh mới hoặc chỉnh lại ảnh của sticker đã có. Kiểm ảnh và thông số chỉnh
// ngay trong request, lưu ảnh gốc, phần dựng chạy trong queue.
final class StickerUploadService
{
    public const ACCEPTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

    public const UNSUPPORTED_FILE_TYPE = 'unsupported_file_type';

    public const FILE_UNREADABLE = 'file_unreadable';

    public const FILE_TOO_LARGE = 'file_too_large';

    public const INVALID_EDIT = 'invalid_edit';

    public const STICKER_BUSY = 'sticker_busy';

    public const DUPLICATE_IN_PACK = 'duplicate_in_pack';

    // Lâu hơn hẳn mọi lượt dựng (RenderStickerJob tối đa 90 giây, hàng đợi
    // retry_after 180 giây): quá mốc này mà còn `processing` là job đã mất.
    public const STALE_PROCESSING_SECONDS = 15 * 60;

    private const UPLOAD_FIELD = 'file';

    private const EDIT_FIELD = 'edit';

    private const CONTENT_HASH_ALGORITHM = 'sha256';

    // Loại ảnh đọc từ nội dung tệp (không tin đuôi tệp) → đuôi của ảnh gốc lưu lại.
    private const ORIGINAL_EXTENSIONS_BY_MIME = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    private const OVERSIZED_UPLOAD_ERRORS = [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE];

    public function __construct(private readonly StickerFileJanitor $janitor) {}

    public static function maxUploadBytes(): int
    {
        return (int) config('yona.stickers.max_original_mb') * 1024 * 1024;
    }

    /** @return array<string, int> */
    public static function limitPlaceholders(): array
    {
        return ['max_upload_mb' => intdiv(self::maxUploadBytes(), 1024 * 1024)];
    }

    /**
     * Cùng ảnh gốc với cùng thông số chỉnh tải lại vào cùng bộ thì trả sticker
     * cũ; sticker cũ đã hỏng hoặc kẹt `processing` quá lâu thì được dựng lại.
     *
     * @param  array<mixed>  $keywords
     *
     * @throws ValidationException khi ảnh hoặc thông số chỉnh bị từ chối, câu báo lỗi ở errors.sticker_uploads.*
     */
    public function upload(StickerPack $pack, UploadedFile $file, ?string $label = null, array $keywords = [], ?string $editJson = null, ?Closure $ensureRoom = null): Sticker
    {
        $edit = $this->parsedEdit($editJson);
        $originalExtension = $this->originalExtension($file);
        $contentHash = $this->contentHash($file, $edit);

        // Ảnh đã có trong bộ thì trả sticker cũ kể cả khi bộ đã đầy; chỉ sticker mới mới tốn chỗ.
        if ($ensureRoom !== null && ! $pack->stickers()->where('content_hash', $contentHash)->exists()) {
            $ensureRoom();
        }

        $sticker = $pack->stickers()->createOrFirst(
            ['content_hash' => $contentHash],
            $this->newStickerAttributes($pack, $label, $keywords),
        );

        if (! $sticker->wasRecentlyCreated && ! $this->needsRender($sticker)) {
            return $sticker;
        }

        $originalPath = StickerFileLayout::originalPath($contentHash, $originalExtension);
        if (! $this->storeOriginal($file, $originalPath)) {
            $sticker->update(['status' => Sticker::STATUS_FAILED, 'failure_code' => RenderStickerJob::STORAGE_WRITE_FAILED]);

            return $sticker;
        }

        // touch() lưu luôn mốc thời gian: hạn kẹt tính lại từ lượt dựng này.
        $sticker->fill([
            'original_path' => $originalPath,
            'edit_params' => $edit->isEmpty() ? null : $edit->params,
            'status' => Sticker::STATUS_PROCESSING,
            'failure_code' => null,
        ])->touch();
        RenderStickerJob::dispatch($sticker)->afterCommit();

        return $sticker;
    }

    /**
     * Dựng lại sticker từ chính ảnh gốc đã lưu với thông số chỉnh mới: giữ id, vị
     * trí, nhãn, từ khoá. Hash nội dung đổi nên tệp mới nằm thư mục mới (URL mới,
     * CDN không giữ ảnh cũ); bản đang dùng giữ tới khi bản mới dựng xong, tệp cũ
     * chỉ bị dọn khi không còn tin hay sticker nào trỏ tới (StickerFileJanitor).
     *
     * @throws ValidationException khi thông số chỉnh bị từ chối, sticker đang dựng, mất ảnh gốc hoặc trùng sticker khác trong bộ
     */
    public function reedit(Sticker $sticker, ?string $editJson): Sticker
    {
        $edit = $this->parsedEdit($editJson);
        if ($this->isRendering($sticker)) {
            throw $this->rejection(self::STICKER_BUSY, self::EDIT_FIELD);
        }

        $original = $sticker->original_path === null ? null : Storage::disk(Sticker::DISK)->get($sticker->original_path);
        if ($original === null) {
            throw $this->rejection(RenderStickerJob::ORIGINAL_MISSING, self::EDIT_FIELD);
        }

        $contentHash = $this->storedContentHash($original, $edit);
        if ($contentHash === $sticker->content_hash) {
            return $sticker;
        }
        if ($sticker->stickerPack->stickers()->where('content_hash', $contentHash)->exists()) {
            throw $this->rejection(self::DUPLICATE_IN_PACK, self::EDIT_FIELD);
        }

        $originalPath = StickerFileLayout::originalPath($contentHash, pathinfo($sticker->original_path, PATHINFO_EXTENSION));
        $disk = Storage::disk(Sticker::DISK);
        if (! $disk->exists($originalPath) && ! $disk->put($originalPath, $original)) {
            throw $this->rejection(RenderStickerJob::STORAGE_WRITE_FAILED, self::EDIT_FIELD);
        }

        // Sticker hỏng không có bản nào để giữ: dọn luôn tệp cũ như khi xoá sticker.
        $current = $sticker->status === Sticker::STATUS_READY ? StickerVersion::of($sticker) : null;
        $releasedHash = $sticker->content_hash;
        try {
            DB::transaction(fn () => $sticker->fill([
                'content_hash' => $contentHash,
                'original_path' => $originalPath,
                'edit_params' => $edit->isEmpty() ? null : $edit->params,
                'status' => Sticker::STATUS_PROCESSING,
                'failure_code' => null,
            ])->touch());
        } catch (UniqueConstraintViolationException) {
            throw $this->rejection(self::DUPLICATE_IN_PACK, self::EDIT_FIELD);
        }

        RenderStickerJob::dispatch($sticker, superseded: $current)->afterCommit();
        if ($current === null) {
            $this->janitor->releaseIfUnreferenced($releasedHash);
        }

        return $sticker;
    }

    private function isRendering(Sticker $sticker): bool
    {
        return $sticker->status === Sticker::STATUS_PROCESSING && ! $this->needsRender($sticker);
    }

    private function needsRender(Sticker $sticker): bool
    {
        return $sticker->status === Sticker::STATUS_FAILED
            || ($sticker->status === Sticker::STATUS_PROCESSING
                && $sticker->updated_at->lte(now()->subSeconds(self::STALE_PROCESSING_SECONDS)));
    }

    private function parsedEdit(?string $editJson): StickerEdit
    {
        try {
            return StickerEdit::fromJson($editJson);
        } catch (InvalidArgumentException) {
            throw $this->rejection(self::INVALID_EDIT, self::EDIT_FIELD);
        }
    }

    private function originalExtension(UploadedFile $file): string
    {
        if (! in_array(strtolower($file->getClientOriginalExtension()), self::ACCEPTED_EXTENSIONS, true)) {
            throw $this->rejection(self::UNSUPPORTED_FILE_TYPE);
        }
        if (! $file->isValid()) {
            throw $this->rejection(in_array($file->getError(), self::OVERSIZED_UPLOAD_ERRORS, true) ? self::FILE_TOO_LARGE : self::FILE_UNREADABLE);
        }
        if ($file->getSize() > self::maxUploadBytes()) {
            throw $this->rejection(self::FILE_TOO_LARGE);
        }

        $sniffedMimeType = (new finfo(FILEINFO_MIME_TYPE))->file((string) $file->getRealPath());

        return self::ORIGINAL_EXTENSIONS_BY_MIME[$sniffedMimeType] ?? throw $this->rejection(self::UNSUPPORTED_FILE_TYPE);
    }

    private function contentHash(UploadedFile $file, StickerEdit $edit): string
    {
        $context = hash_init(self::CONTENT_HASH_ALGORITHM);
        if (! hash_update_file($context, (string) $file->getRealPath())) {
            throw $this->rejection(self::FILE_UNREADABLE);
        }

        return $this->finalContentHash($context, $edit);
    }

    private function storedContentHash(string $original, StickerEdit $edit): string
    {
        $context = hash_init(self::CONTENT_HASH_ALGORITHM);
        hash_update($context, $original);

        return $this->finalContentHash($context, $edit);
    }

    private function finalContentHash(HashContext $context, StickerEdit $edit): string
    {
        hash_update($context, "\n".$edit->json());

        return hash_final($context);
    }

    // Disk `stickers` không ném lỗi khi ghi hỏng nên phải kiểm giá trị trả về.
    private function storeOriginal(UploadedFile $file, string $originalPath): bool
    {
        return Storage::disk(Sticker::DISK)->putFileAs(dirname($originalPath), $file, basename($originalPath)) !== false;
    }

    /**
     * Cạnh ảnh là cạnh sticker sẽ dựng; số khung, thời lượng, dung lượng chỉ
     * biết sau khi dựng.
     *
     * @param  array<mixed>  $keywords
     * @return array<string, mixed>
     */
    private function newStickerAttributes(StickerPack $pack, ?string $label, array $keywords): array
    {
        $lastPosition = $pack->stickers()->max('position');

        return [
            'label' => StickerTags::label($label),
            'keywords' => StickerTags::keywords($keywords),
            'width' => Sticker::imageSize(),
            'height' => Sticker::imageSize(),
            'status' => Sticker::STATUS_PROCESSING,
            'position' => $lastPosition === null ? 0 : (int) $lastPosition + 1,
        ];
    }

    private function rejection(string $code, string $field = self::UPLOAD_FIELD): ValidationException
    {
        return ValidationException::withMessages([
            $field => __("errors.sticker_uploads.{$code}", self::limitPlaceholders()),
        ]);
    }
}
