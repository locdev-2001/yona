<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserSession;
use Illuminate\Http\Request;

// Bản gốc dùng gem `browser`
// để đọc user agent; ở đây nhận diện bằng bảng mẫu tối giản đủ cho nhãn hiển thị.
class UserSessionTrackingService
{
    private const BROWSERS = [
        ['pattern' => '/Edg[eA]?\/([\d.]+)/', 'name' => 'Microsoft Edge'],
        ['pattern' => '/OPR\/([\d.]+)/', 'name' => 'Opera'],
        ['pattern' => '/Chrome\/([\d.]+)/', 'name' => 'Chrome'],
        ['pattern' => '/Firefox\/([\d.]+)/', 'name' => 'Firefox'],
        ['pattern' => '/Version\/([\d.]+).*Safari/', 'name' => 'Safari'],
    ];

    private const PLATFORMS = [
        ['pattern' => '/Windows NT ([\d.]+)/', 'name' => 'Windows'],
        ['pattern' => '/Mac OS X ([\d_.]+)/', 'name' => 'macOS'],
        ['pattern' => '/Android ([\d.]+)/', 'name' => 'Android'],
        ['pattern' => '/(?:iPhone|iPad); CPU(?: iPhone)? OS ([\d_]+)/', 'name' => 'iOS'],
        // Tên đúng như gem `browser` trả về (đối chiếu pixel-diff).
        ['pattern' => '/Linux/', 'name' => 'Generic Linux'],
    ];

    private const UNKNOWN_BROWSER = 'Unknown Browser';

    public function __construct(
        private readonly User $user,
        private readonly Request $request,
        private readonly string $clientId,
    ) {}

    public function createOrUpdate(): UserSession
    {
        $session = UserSession::query()->firstOrNew([
            'user_id' => $this->user->id,
            'client_id' => $this->clientId,
        ]);

        $session->fill($this->sessionAttributes());
        $session->last_activity_at = now();
        $session->save();

        return $session;
    }

    public function updateActivity(): void
    {
        $session = UserSession::query()
            ->where('user_id', $this->user->id)
            ->where('client_id', $this->clientId)
            ->first();

        if (! $session || ! $session->shouldUpdateActivity()) {
            return;
        }

        $session->forceFill(['last_activity_at' => now()])->saveQuietly();
    }

    /** @return array<string, string|null> */
    private function sessionAttributes(): array
    {
        $userAgent = (string) $this->request->userAgent();
        [$browserName, $browserVersion] = $this->detect(self::BROWSERS, $userAgent, self::UNKNOWN_BROWSER);
        [$platformName, $platformVersion] = $this->detect(self::PLATFORMS, $userAgent, 'Unknown');

        return [
            'ip_address' => $this->request->ip(),
            'user_agent' => $userAgent,
            'browser_name' => $browserName,
            'browser_version' => $browserVersion,
            'device_name' => $this->deviceName($userAgent, $platformName),
            'platform_name' => $platformName,
            'platform_version' => $platformVersion === null ? null : str_replace('_', '.', $platformVersion),
        ];
    }

    /**
     * @param  list<array{pattern: string, name: string}>  $table
     * @return array{0: string, 1: string|null}
     */
    private function detect(array $table, string $userAgent, string $fallback): array
    {
        foreach ($table as $entry) {
            if (preg_match($entry['pattern'], $userAgent, $matches) === 1) {
                return [$entry['name'], $matches[1] ?? null];
            }
        }

        return [$fallback, null];
    }

    private function deviceName(string $userAgent, string $platformName): string
    {
        if (str_contains($userAgent, 'iPad')) {
            return 'iPad';
        }
        if (str_contains($userAgent, 'iPhone')) {
            return 'iPhone';
        }
        if ($platformName === 'Android') {
            return 'Android';
        }

        return 'Unknown';
    }
}
