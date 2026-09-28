<?php

namespace App\Services\Stickers;

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use App\Models\StickerPack;
use Illuminate\Http\UploadedFile;
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

    private const CONTENT_HASH_ALGORITHM = 'sha256';

    public function __construct(
        private readonly LottieDocumentValidator $validator,
        private readonly LottieMinifier $minifier,
    ) {}

    /**
     * Cùng nội dung upload lại vào cùng bộ thì trả sticker cũ; sticker cũ đã
     * hỏng hoặc kẹt `processing` quá lâu thì được dựng lại.
     *
     * @param  array<mixed>  $keywords
     *
     * @throws ValidationException khi tệp bị từ chối, câu báo lỗi ở errors.sticker_uploads.*
     */
    public function upload(StickerPack $pack, UploadedFile $file, ?string $label = null, array $keywords = []): Sticker
    {
        return $this->store($pack, $this->preparedAnimation($this->readUpload($file)), $label, $keywords);
    }

    /**
     * Nội dung tệp đã có sẵn trong bộ nhớ (Platform API, MCP): cùng cổng kiểm như
     * upload tệp, `$extension` là đuôi tệp gốc (json hoặc tgs).
     *
     * @param  array<mixed>  $keywords
     *
     * @throws ValidationException khi nội dung bị từ chối, câu báo lỗi ở errors.sticker_uploads.*
     */
    public function uploadContents(StickerPack $pack, string $contents, string $extension, ?string $label = null, array $keywords = []): Sticker
    {
        return $this->store($pack, $this->prepareContents($contents, $extension), $label, $keywords);
    }

    /**
     * Kiểm và rút gọn nội dung như lúc tải lên nhưng không lưu gì: đúng bản JSON
     * mà kho sẽ lưu, kèm tài liệu đã giải mã.
     *
     * @return array{json: string, document: stdClass}
     *
     * @throws ValidationException khi nội dung bị từ chối, câu báo lỗi ở errors.sticker_uploads.*
     */
    public function prepareContents(string $contents, string $extension): array
    {
        $this->assertAcceptedExtension($extension);
        if (strlen($contents) > LottieDocumentValidator::MAX_UPLOAD_BYTES) {
            throw $this->rejection(LottieDocumentValidator::FILE_TOO_LARGE);
        }

        return $this->preparedAnimation($contents);
    }

    /**
     * @return array{width: int, height: int, frame_count: int, duration_ms: int}
     */
    public static function animationMetrics(stdClass $document): array
    {
        $frameSpan = $document->op - $document->ip;

        return [
            'width' => (int) round($document->w),
            'height' => (int) round($document->h),
            'frame_count' => (int) round($frameSpan),
            'duration_ms' => (int) round($frameSpan / $document->fr * 1000),
        ];
    }

    /**
     * @return array{json: string, document: stdClass}
     */
    private function preparedAnimation(string $uploadedBytes): array
    {
        $animationJson = $this->minifier->minify($this->validated($this->validator->inspect($uploadedBytes)));

        // Rút gọn đổi số (0.0 thành 0, làm tròn) nên kiểm lại đúng bản sẽ lưu:
        // trình phát đọc bản này, không đọc tệp gốc.
        return ['json' => $animationJson, 'document' => $this->validated($this->validator->inspectStored($animationJson))];
    }

    /**
     * @param  array{json: string, document: stdClass}  $prepared
     * @param  array<mixed>  $keywords
     */
    private function store(StickerPack $pack, array $prepared, ?string $label, array $keywords): Sticker
    {
        ['json' => $animationJson, 'document' => $document] = $prepared;

        $sticker = $pack->stickers()->createOrFirst(
            ['content_hash' => hash(self::CONTENT_HASH_ALGORITHM, $animationJson)],
            $this->newStickerAttributes($pack, $document, $animationJson, $label, $keywords),
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

    private function assertAcceptedExtension(string $extension): void
    {
        if (! in_array(strtolower($extension), self::ACCEPTED_EXTENSIONS, true)) {
            throw $this->rejection(self::UNSUPPORTED_FILE_TYPE);
        }
    }

    private function readUpload(UploadedFile $file): string
    {
        $this->assertAcceptedExtension($file->getClientOriginalExtension());
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
     * @param  array<mixed>  $keywords
     * @return array<string, mixed>
     */
    private function newStickerAttributes(StickerPack $pack, stdClass $document, string $animationJson, ?string $label, array $keywords): array
    {
        $lastPosition = $pack->stickers()->max('position');

        return [
            'label' => StickerTags::label($label),
            'keywords' => StickerTags::keywords($keywords),
            ...self::animationMetrics($document),
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
