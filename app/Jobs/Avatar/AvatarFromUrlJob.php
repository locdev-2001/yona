<?php

namespace App\Jobs\Avatar;

use App\Jobs\ApplicationJob;
use App\Models\Contact;
use App\Support\AvatarContentType;
use App\Support\SafeHttp;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// Port từ refs/chatwoot/app/jobs/avatar/avatar_from_url_job.rb: tải avatar
// từ URL rồi gắn vào model (Avatarable). Với Contact còn rate-limit 1 phút
// + so hash URL (lưu trong additional_attributes) để không tải lại vô ích.
//
// Hai khác biệt CỐ Ý so với bản gốc (xem plans/.../reports/g1-contact-sync-notes.md):
//   1. Kiểu ảnh lấy từ nội dung (AvatarContentType::resolve) chứ không
//      tin header — CDN avatar Zalo trả `image/jpg`, gốc loại thẳng vì không nằm
//      trong allowlist nên khách Zalo không bao giờ có avatar.
//   2. `avatar_url_hash` chỉ ghi khi gắn được ảnh. Gốc ghi cả khi thất bại, khiến
//      một lần hỏng là khoá vĩnh viễn URL đó. `last_avatar_sync_at` vẫn ghi mọi
//      lượt nên cửa sổ 1 phút vẫn chặn tải lại dồn dập.
class AvatarFromUrlJob extends ApplicationJob
{
    private const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;

    private const RATE_LIMIT_SECONDS = 60;

    public function __construct(
        private readonly EloquentModel $avatarable,
        private readonly ?string $avatarUrl,
    ) {
        $this->onQueue('purgable');
    }

    public function handle(): void
    {
        $attached = false;

        try {
            if ($this->syncableAvatar()) {
                $attached = $this->fetchAndAttachAvatar();
            }
        } catch (\Throwable $e) {
            Log::error("AvatarFromUrlJob error for {$this->avatarUrl}: ".$e::class." - {$e->getMessage()}");
        } finally {
            $this->updateAvatarSyncAttributes($attached);
        }
    }

    private function syncableAvatar(): bool
    {
        return method_exists($this->avatarable, 'avatar')
            && filter_var($this->avatarUrl, FILTER_VALIDATE_URL) !== false
            && $this->shouldSyncAvatar();
    }

    private function shouldSyncAvatar(): bool
    {
        if (! $this->avatarable instanceof Contact) {
            return true;
        }

        $attrs = $this->avatarable->additional_attributes ?? [];

        return ! $this->withinRateLimit($attrs) && ! $this->duplicateUrl($attrs);
    }

    private function withinRateLimit(array $attrs): bool
    {
        $lastSyncAt = $attrs['last_avatar_sync_at'] ?? null;

        return filled($lastSyncAt)
            && Carbon::parse($lastSyncAt)->greaterThan(now()->subSeconds(self::RATE_LIMIT_SECONDS));
    }

    private function duplicateUrl(array $attrs): bool
    {
        $storedHash = $attrs['avatar_url_hash'] ?? null;

        return filled($storedHash) && $storedHash === hash('sha256', (string) $this->avatarUrl);
    }

    private function fetchAndAttachAvatar(): bool
    {
        SafeHttp::assertPublicUrl((string) $this->avatarUrl);

        $response = Http::timeout(15)->withOptions(['allow_redirects' => ['max' => 3]])->get($this->avatarUrl);

        if (! $response->successful()) {
            Log::info("AvatarFromUrlJob: avatar not fetchable at {$this->avatarUrl} ({$response->status()})");

            return false;
        }

        $body = $response->body();

        if (strlen($body) > self::MAX_DOWNLOAD_BYTES) {
            Log::warning("AvatarFromUrlJob: avatar too large at {$this->avatarUrl} (".strlen($body).' bytes)');

            return false;
        }

        $declaredContentType = (string) $response->header('Content-Type');
        $contentType = AvatarContentType::resolve($declaredContentType, $body);

        if ($contentType === null) {
            Log::warning("AvatarFromUrlJob: nội dung không phải ảnh dùng được tại {$this->avatarUrl} (Content-Type: {$declaredContentType})");

            return false;
        }

        $filename = basename(parse_url((string) $this->avatarUrl, PHP_URL_PATH) ?: '') ?: 'avatar';

        $this->avatarable->replaceAvatarFromContents($body, $filename, $contentType);

        return true;
    }

    private function updateAvatarSyncAttributes(bool $attached): void
    {
        if (! $this->avatarable instanceof Contact || blank($this->avatarUrl)) {
            return;
        }

        $additionalAttributes = $this->avatarable->additional_attributes ?? [];
        $additionalAttributes['last_avatar_sync_at'] = now()->toIso8601String();

        if ($attached) {
            $additionalAttributes['avatar_url_hash'] = hash('sha256', $this->avatarUrl);
        }

        // update_columns của bản gốc: ghi thẳng, không chạy lại hook/validation.
        $this->avatarable->forceFill(['additional_attributes' => $additionalAttributes])->saveQuietly();
    }
}
