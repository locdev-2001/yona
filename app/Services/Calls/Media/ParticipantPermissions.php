<?php

namespace App\Services\Calls\Media;

// Quyền của một người khi vào phòng: được phát nguồn nào, có nghe/xem người khác không.
// Không có kênh dữ liệu trong phòng: chat trong phòng đi qua hội thoại sẵn có.
final readonly class ParticipantPermissions
{
    /** @param  list<MediaSource>  $publishableSources */
    public function __construct(
        public array $publishableSources,
        public bool $canSubscribe = true,
    ) {}

    public static function allSources(): self
    {
        return new self(MediaSource::cases());
    }

    public function canPublish(): bool
    {
        return $this->publishableSources !== [];
    }
}
