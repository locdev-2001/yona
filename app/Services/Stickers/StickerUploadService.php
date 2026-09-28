<?php

namespace App\Services\Stickers;

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use App\Models\StickerPack;
use Closure;
use finfo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

// Lối vào duy nhất cho mọi lượt tải sticker (Super Admin lẫn tenant): kiểm ảnh
// và thông số chỉnh ngay trong request, lưu ảnh gốc, phần dựng chạy trong queue.
final class StickerUploadService
{
    public const ACCEPTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

    public const UNSUPPORTED_FILE_TYPE = 'unsupported_file_type';

    public const FILE_UNREADABLE = 'file_unreadable';

    public const FILE_TOO_LARGE = 'file_too_large';

    public const INVALID_EDIT = 'invalid_edit';

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
