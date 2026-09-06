<?php

namespace App\Models;

use App\Exceptions\MessageValidationException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

// Port từ refs/chatwoot/app/models/attachment.rb.
// ActiveStorage thay bằng cột disk/path/filename/content_type/byte_size (quyết định #9)
// và attachable morph thay `belongs_to :message` (bảng dùng chung với avatar A4).
class Attachment extends Model
{
    public const FILE_TYPE_IMAGE = 0;

    public const FILE_TYPE_AUDIO = 1;

    public const FILE_TYPE_VIDEO = 2;

    public const FILE_TYPE_FILE = 3;

    public const FILE_TYPE_LOCATION = 4;

    public const FILE_TYPE_FALLBACK = 5;

    public const FILE_TYPE_SHARE = 6;

    public const FILE_TYPE_STORY_MENTION = 7;

    public const FILE_TYPE_CONTACT = 8;

    public const FILE_TYPE_IG_REEL = 9;

    public const FILE_TYPE_IG_POST = 10;

    public const FILE_TYPE_IG_STORY = 11;

    public const FILE_TYPE_EMBED = 12;

    public const FILE_TYPES = [
        'image' => self::FILE_TYPE_IMAGE,
        'audio' => self::FILE_TYPE_AUDIO,
        'video' => self::FILE_TYPE_VIDEO,
        'file' => self::FILE_TYPE_FILE,
        'location' => self::FILE_TYPE_LOCATION,
        'fallback' => self::FILE_TYPE_FALLBACK,
        'share' => self::FILE_TYPE_SHARE,
        'story_mention' => self::FILE_TYPE_STORY_MENTION,
        'contact' => self::FILE_TYPE_CONTACT,
        'ig_reel' => self::FILE_TYPE_IG_REEL,
        'ig_post' => self::FILE_TYPE_IG_POST,
        'ig_story' => self::FILE_TYPE_IG_STORY,
        'embed' => self::FILE_TYPE_EMBED,
    ];

    public const ACCEPTABLE_FILE_TYPES = [
        'text/csv', 'text/plain', 'text/rtf', 'text/xml',
        'application/json', 'application/pdf',
        'application/xml',
        'application/zip', 'application/x-7z-compressed', 'application/vnd.rar', 'application/x-tar',
        'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/rtf',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/x-pkcs12', 'application/pkcs12',
    ];

    public const ACCEPTABLE_FILE_EXTENSIONS = ['pfx', 'xml'];

    public const GENERIC_FILE_CONTENT_TYPES = ['application/octet-stream'];

    // FileTypeHelper#image_file? / #video_file? — danh sách loại xem trước được.
    private const IMAGE_CONTENT_TYPES = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image',
    ];

    private const VIDEO_CONTENT_TYPES = [
        'video/ogg', 'video/mp4', 'video/webm', 'video/quicktime', 'video',
    ];

    // with_attached_file? — các loại thực sự mang tệp trên đĩa.
    private const FILE_BEARING_TYPES = [
        self::FILE_TYPE_IMAGE, self::FILE_TYPE_AUDIO, self::FILE_TYPE_VIDEO, self::FILE_TYPE_FILE,
    ];

    protected $fillable = [
        'account_id',
        'role',
        'file_type',
        'extension',
        'external_url',
        'coordinates_lat',
        'coordinates_long',
        'fallback_title',
        'meta',
        'disk',
        'path',
        'filename',
        'content_type',
        'byte_size',
    ];

    protected $attributes = [
        'disk' => 'public',
        'file_type' => self::FILE_TYPE_IMAGE,
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Attachment $attachment) {
            $attachment->setExtension();
            $attachment->validateExternalUrlLength();
            $attachment->validateFile();
        });

        static::deleted(function (Attachment $attachment) {
            if ($attachment->path) {
                Storage::disk($attachment->disk)->delete($attachment->path);
            }
        });
    }

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    // FileTypeHelper#file_type — suy loại xem trước từ content-type.
    public static function fileTypeFor(?string $contentType): int
    {
        if (in_array($contentType, self::IMAGE_CONTENT_TYPES, true)) {
            return self::FILE_TYPE_IMAGE;
        }

        if (in_array($contentType, self::VIDEO_CONTENT_TYPES, true)) {
            return self::FILE_TYPE_VIDEO;
        }

        if ($contentType !== null && str_contains($contentType, 'audio/')) {
            return self::FILE_TYPE_AUDIO;
        }

        return self::FILE_TYPE_FILE;
    }

    /**
     * Lưu tệp tải lên vào đĩa và trả về thuộc tính dựng bản ghi — nguồn duy nhất
     * cho cả đường multipart (MessageBuilder) lẫn đường upload trực tiếp.
     *
     * @return array<string, mixed>
     */
    public static function storeUpload(UploadedFile $file, ?int $accountId): array
    {
        $contentType = $file->getClientMimeType() ?: $file->getMimeType();
        $dimensions = self::imageDimensions($file);
        $path = $file->store(self::uploadDirectory($accountId), 'public');

        return [
            'account_id' => $accountId,
            'file_type' => self::fileTypeFor($contentType),
            'disk' => 'public',
            'path' => $path,
            'filename' => $file->getClientOriginalName(),
            'content_type' => $contentType,
            'byte_size' => (int) $file->getSize(),
            'meta' => $dimensions,
        ];
    }

    /**
     * Tương đương signed_id của ActiveStorage — tham chiếu tệp đã lưu, ký kèm
     * account để không dùng chéo tài khoản.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function signUpload(array $attributes): string
    {
        return Crypt::encryptString(json_encode($attributes));
    }

    // Tham chiếu đã ký tới chính tệp này — cho phép gửi lại một tệp đã lưu
    // (vd tệp của macro) qua MessageBuilder mà không tải lên lần nữa.
    public function signedReference(): string
    {
        return self::signUpload([
            'account_id' => $this->account_id,
            'file_type' => $this->file_type,
            'disk' => $this->disk,
            'path' => $this->path,
            'filename' => $this->filename,
            'content_type' => $this->content_type,
            'byte_size' => $this->byte_size,
            'meta' => $this->meta ?? [],
        ]);
    }

    /** @return array<string, mixed> */
    public static function resolveSignedUpload(string $signedId, ?int $accountId): array
    {
        try {
            $attributes = json_decode(Crypt::decryptString($signedId), true);
        } catch (DecryptException) {
            $attributes = null;
        }

        if (! is_array($attributes) || ($attributes['account_id'] ?? null) !== $accountId) {
            throw new MessageValidationException('Attachment reference is invalid');
        }

        return $attributes;
    }

    private static function uploadDirectory(?int $accountId): string
    {
        return 'attachments/'.($accountId ?? 'shared');
    }

    /** @return array<string, int> */
    private static function imageDimensions(UploadedFile $file): array
    {
        $path = $file->getRealPath();

        if ($path === false || ! is_file($path)) {
            return [];
        }

        $size = @getimagesize($path);

        return $size === false ? [] : ['width' => $size[0], 'height' => $size[1]];
    }

    public function fileTypeName(): string
    {
        return array_flip(self::FILE_TYPES)[$this->file_type];
    }

    public function isImage(): bool
    {
        return $this->file_type === self::FILE_TYPE_IMAGE;
    }

    public function withAttachedFile(): bool
    {
        return in_array($this->file_type, self::FILE_BEARING_TYPES, true) && $this->hasFile();
    }

    public function hasFile(): bool
    {
        return filled($this->path);
    }

    // file_url gốc trả '' khi chưa gắn tệp.
    public function fileUrl(): string
    {
        // URL kết thúc bằng tên tệp gốc như ActiveStorage — giao diện lấy tên
        // hiển thị từ chính URL này.
        return $this->hasFile()
            ? route('attachments.show', ['attachment' => $this->id, 'filename' => $this->filename])
            : '';
    }

    // Chatwoot dùng blob url riêng cho dịch vụ ngoài; ở đây cùng một URL đĩa.
    public function downloadUrl(): string
    {
        return $this->fileUrl();
    }

    // Gốc resize 250px qua ActiveStorage representation — chưa có biến thể ảnh
    // nên trả cùng URL gốc (khác biệt cố ý, ghi ở trace).
    public function thumbUrl(): string
    {
        return $this->hasFile() && $this->isImage() ? $this->fileUrl() : '';
    }

    // Attachment#url — dùng chung cho avatar (A4) lẫn attachment tin nhắn.
    public function url(): ?string
    {
        if ($this->external_url) {
            return $this->external_url;
        }

        return $this->path ? Storage::disk($this->disk)->url($this->path) : null;
    }

    // Tương đương belongs_to :message — attachable morph về Message.
    public function messageId(): ?int
    {
        return $this->attachable_type === 'Message' ? $this->attachable_id : null;
    }

    // _attachment.json.jbuilder = push_event_data + created_at của message
    // (sender chỉ dùng ở kênh khác, FE chia sẻ tệp không đọc tới).
    public function apiData(): array
    {
        $message = $this->attachable instanceof Message ? $this->attachable : null;

        return [
            ...$this->pushEventData(),
            'created_at' => $message?->created_at?->timestamp,
        ];
    }

    public function pushEventData(): array
    {
        return [...$this->baseData(), ...$this->metadataForFileType()];
    }

    private function baseData(): array
    {
        return [
            'id' => $this->id,
            'message_id' => $this->messageId(),
            'file_type' => $this->fileTypeName(),
            'account_id' => $this->account_id,
        ];
    }

    private function metadataForFileType(): array
    {
        return match ($this->file_type) {
            self::FILE_TYPE_LOCATION => $this->locationMetadata(),
            self::FILE_TYPE_FALLBACK => $this->fallbackData(),
            self::FILE_TYPE_CONTACT => $this->contactMetadata(),
            self::FILE_TYPE_AUDIO => $this->audioMetadata(),
            self::FILE_TYPE_EMBED => ['data_url' => $this->external_url],
            default => $this->hasFile()
                ? $this->fileMetadata()
                : ['data_url' => $this->external_url, 'thumb_url' => ''],
        };
    }

    private function fileMetadata(): array
    {
        return [
            'extension' => $this->extension,
            'content_type' => $this->content_type,
            'data_url' => $this->fileUrl(),
            'thumb_url' => $this->thumbUrl(),
            'file_size' => $this->byte_size,
            'width' => $this->meta['width'] ?? null,
            'height' => $this->meta['height'] ?? null,
        ];
    }

    private function audioMetadata(): array
    {
        return [
            ...$this->baseData(),
            ...$this->fileMetadata(),
            'data_url' => $this->fileUrl(),
            'transcribed_text' => $this->meta['transcribed_text'] ?? '',
        ];
    }

    private function locationMetadata(): array
    {
        return [
            'coordinates_lat' => $this->coordinates_lat,
            'coordinates_long' => $this->coordinates_long,
            'fallback_title' => $this->fallback_title,
            'data_url' => $this->external_url,
        ];
    }

    private function fallbackData(): array
    {
        return [
            'fallback_title' => $this->fallback_title,
            'data_url' => $this->external_url,
        ];
    }

    private function contactMetadata(): array
    {
        return [
            'fallback_title' => $this->fallback_title,
            'meta' => $this->meta ?? [],
        ];
    }

    private function setExtension(): void
    {
        if (! $this->hasFile() || filled($this->extension)) {
            return;
        }

        $this->extension = pathinfo((string) $this->filename, PATHINFO_EXTENSION) ?: null;
    }

    private function validateExternalUrlLength(): void
    {
        $limit = (int) config('limits.url_length');

        if ($this->external_url !== null && mb_strlen($this->external_url) > $limit) {
            throw new MessageValidationException("External url is too long (maximum is {$limit} characters)");
        }
    }

    // acceptable_file — gốc chỉ chặn loại/kích thước tệp với inbox website widget.
    // Public để MessageBuilder kiểm TRƯỚC khi lưu tin (Rails validate rồi mới save!).
    public function validateFile(): void
    {
        if (! $this->shouldValidateFile()) {
            return;
        }

        $this->validateFileSize((int) $this->byte_size);
        $this->validateFileContentType($this->content_type);
    }

    private function shouldValidateFile(): bool
    {
        if (! $this->hasFile()) {
            return false;
        }

        $attachable = $this->attachable;

        return $attachable instanceof Message && $attachable->inbox?->channel_type === 'Channel::WebWidget';
    }

    private function validateFileContentType(?string $contentType): void
    {
        if ($this->isMediaFile($contentType) || in_array($contentType, self::ACCEPTABLE_FILE_TYPES, true)) {
            return;
        }

        $isGeneric = blank($contentType) || in_array($contentType, self::GENERIC_FILE_CONTENT_TYPES, true);

        if ($isGeneric && in_array($this->fileExtension(), self::ACCEPTABLE_FILE_EXTENSIONS, true)) {
            return;
        }

        throw new MessageValidationException('File type not supported');
    }

    private function validateFileSize(int $byteSize): void
    {
        $limitMb = (int) config('limits.maximum_file_upload_size');
        $limitMb = $limitMb <= 0 ? 40 : $limitMb;

        if ($byteSize > $limitMb * 1024 * 1024) {
            throw new MessageValidationException('File size is too big');
        }
    }

    private function isMediaFile(?string $contentType): bool
    {
        return $contentType !== null && (
            str_starts_with($contentType, 'image/')
            || str_starts_with($contentType, 'video/')
            || str_starts_with($contentType, 'audio/')
        );
    }

    private function fileExtension(): string
    {
        return mb_strtolower(pathinfo((string) $this->filename, PATHINFO_EXTENSION));
    }
}
