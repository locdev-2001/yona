<?php

namespace App\Jobs\Avatar;

use App\Jobs\ApplicationJob;
use App\Models\Contact;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/jobs/avatar/avatar_from_url_job.rb: tải avatar
// từ URL rồi gắn vào model (Avatarable). Với Contact còn rate-limit 1 phút
// + so hash URL (lưu trong additional_attributes) để không tải lại vô ích.
class AvatarFromUrlJob extends ApplicationJob
{
    private const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;

    private const RATE_LIMIT_SECONDS = 60;

    private const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    public function __construct(
        private readonly EloquentModel $avatarable,
        private readonly ?string $avatarUrl,
    ) {
        $this->onQueue('purgable');
    }

    public function handle(): void
    {
        try {
            if ($this->syncableAvatar()) {
                $this->fetchAndAttachAvatar();
            }
        } catch (\Throwable $e) {
            Log::error("AvatarFromUrlJob error for {$this->avatarUrl}: ".$e::class." - {$e->getMessage()}");
        } finally {
            $this->updateAvatarSyncAttributes();
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

    private function fetchAndAttachAvatar(): void
    {
        $response = Http::timeout(15)->withOptions(['allow_redirects' => ['max' => 3]])->get($this->avatarUrl);

        if (! $response->successful()) {
            Log::info("AvatarFromUrlJob: avatar not fetchable at {$this->avatarUrl} ({$response->status()})");

            return;
        }

        $contentType = Str::before((string) $response->header('Content-Type'), ';');

        if (! in_array($contentType, self::ALLOWED_CONTENT_TYPES, true) || strlen($response->body()) > self::MAX_DOWNLOAD_BYTES) {
            return;
        }

        $filename = basename(parse_url($this->avatarUrl, PHP_URL_PATH) ?: '') ?: 'avatar';

        $this->avatarable->replaceAvatarFromContents($response->body(), $filename, $contentType);
    }

    private function updateAvatarSyncAttributes(): void
    {
        if (! $this->avatarable instanceof Contact || blank($this->avatarUrl)) {
            return;
        }

        $additionalAttributes = $this->avatarable->additional_attributes ?? [];
        $additionalAttributes['last_avatar_sync_at'] = now()->toIso8601String();
        $additionalAttributes['avatar_url_hash'] = hash('sha256', $this->avatarUrl);

        // update_columns của bản gốc: ghi thẳng, không chạy lại hook/validation.
        $this->avatarable->forceFill(['additional_attributes' => $additionalAttributes])->saveQuietly();
    }
}
