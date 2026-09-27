<?php

namespace App\Services\Stickers;

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use App\Models\StickerPack;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use stdClass;

// Lối vào duy nhất cho mọi upload sticker (Super Admin lẫn tenant): kiểm tra
// an toàn và rút gọn ngay trong request, phần render chạy trong queue.
final class StickerUploadService
{
    public const ACCEPTED_EXTENSIONS = ['json', 'tgs'];

    public const UNSUPPORTED_FILE_TYPE = 'unsupported_file_type';

    public const FILE_UNREADABLE = 'file_unreadable';

    // Lâu hơn hẳn mọi lượt render (RenderStickerJob tối đa 90 giây, hàng đợi
    // retry_after 180 giây): quá mốc này mà còn `processing` là job đã mất.
    public const STALE_PROCESSING_SECONDS = 15 * 60;

    private const UPLOAD_FIELD = 'file';

    private const MAX_LABEL_LENGTH = 255;

    private const CONTENT_HASH_ALGORITHM = 'sha256';

    public function __construct(
        private readonly LottieDocumentValidator $validator,
        private readonly LottieMinifier $minifier,
    ) {}

    /**
     * Cùng nội dung upload lại vào cùng bộ thì trả sticker cũ; sticker cũ đã
     * hỏng hoặc kẹt `processing` quá lâu thì được dựng lại.
     *
     * @throws ValidationException khi tệp bị từ chối, câu báo lỗi ở errors.sticker_uploads.*
     */
    public function upload(StickerPack $pack, UploadedFile $file, ?string $label = null): Sticker
    {
        $animationJson = $this->minifier->minify($this->validated($this->validator->inspect($this->readUpload($file))));
        // Rút gọn đổi số (0.0 thành 0, làm tròn) nên kiểm lại đúng bản sẽ lưu:
        // trình phát đọc bản này, không đọc tệp gốc.
        $document = $this->validated($this->validator->inspectStored($animationJson));

        $sticker = $pack->stickers()->createOrFirst(
            ['content_hash' => hash(self::CONTENT_HASH_ALGORITHM, $animationJson)],
            $this->newStickerAttributes($pack, $document, $animationJson, $label),
        );

        if (! $sticker->wasRecentlyCreated && ! $this->needsRender($sticker)) {
            return $sticker;
        }

        // touch() lưu luôn mốc thời gian: hạn kẹt tính lại từ lượt dựng này.
        $sticker->fill(['status' => Sticker::STATUS_PROCESSING, 'failure_code' => null])->touch();
        RenderStickerJob::dispatch($sticker, $animationJson)->afterCommit();

        return $sticker;
    }

    private function needsRender(Sticker $sticker): bool
    {
        return $sticker->status === Sticker::STATUS_FAILED
            || ($sticker->status === Sticker::STATUS_PROCESSING
                && $sticker->updated_at->lte(now()->subSeconds(self::STALE_PROCESSING_SECONDS)));
    }

    /**
     * @param  array{document: stdClass}|array{rejection: string}  $inspection
     */
    private function validated(array $inspection): stdClass
    {
        return $inspection['document'] ?? throw $this->rejection($inspection['rejection']);
    }

    private function readUpload(UploadedFile $file): string
    {
        if (! in_array(strtolower($file->getClientOriginalExtension()), self::ACCEPTED_EXTENSIONS, true)) {
            throw $this->rejection(self::UNSUPPORTED_FILE_TYPE);
        }
        if (! $file->isValid()) {
            throw $this->rejection(self::FILE_UNREADABLE);
        }
        if ($file->getSize() > LottieDocumentValidator::MAX_UPLOAD_BYTES) {
            throw $this->rejection(LottieDocumentValidator::FILE_TOO_LARGE);
        }

        // Đọc có trần: kích thước khai báo sai cũng không kéo cả tệp lớn vào bộ nhớ.
        $bytes = @file_get_contents((string) $file->getRealPath(), false, null, 0, LottieDocumentValidator::MAX_UPLOAD_BYTES + 1);
        if ($bytes === false) {
            throw $this->rejection(self::FILE_UNREADABLE);
        }

        return $bytes;
    }

    /**
     * @return array<string, mixed>
     */
    private function newStickerAttributes(StickerPack $pack, stdClass $document, string $animationJson, ?string $label): array
    {
        $frameSpan = $document->op - $document->ip;
        $lastPosition = $pack->stickers()->max('position');

        return [
            'label' => filled($label) ? Str::limit(trim($label), self::MAX_LABEL_LENGTH, '') : null,
            'width' => (int) round($document->w),
            'height' => (int) round($document->h),
            'frame_count' => (int) round($frameSpan),
            'duration_ms' => (int) round($frameSpan / $document->fr * 1000),
            'byte_size' => strlen($animationJson),
            'status' => Sticker::STATUS_PROCESSING,
            'position' => $lastPosition === null ? 0 : (int) $lastPosition + 1,
        ];
    }

    private function rejection(string $code): ValidationException
    {
        return ValidationException::withMessages([
            self::UPLOAD_FIELD => __("errors.sticker_uploads.{$code}", LottieDocumentValidator::limitPlaceholders()),
        ]);
    }
}
