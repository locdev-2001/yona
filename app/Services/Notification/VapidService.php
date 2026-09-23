<?php

namespace App\Services\Notification;

use App\Models\InstallationConfig;
use Illuminate\Container\Attributes\Scoped;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\VAPID;
use Throwable;

// Port từ refs/chatwoot/lib/vapid_service.rb — nguồn DUY NHẤT của cặp khoá VAPID,
// cũng là câu trả lời duy nhất cho "máy chủ này gửi được thông báo đẩy không":
// publicKey() null (máy thiếu hỗ trợ đường cong P-256 của OpenSSL) thì giao diện
// ẩn phần thông báo đẩy và job đẩy không gửi gì.
#[Scoped]
class VapidService
{
    public const CONFIG_NAME = 'VAPID_KEYS';

    /** @var array{public_key: string, private_key: string}|null */
    private ?array $keys = null;

    private bool $isResolved = false;

    public function publicKey(): ?string
    {
        return $this->keys()['public_key'] ?? null;
    }

    public function privateKey(): ?string
    {
        return $this->keys()['private_key'] ?? null;
    }

    /** @return array{public_key: string, private_key: string}|null */
    private function keys(): ?array
    {
        if (! $this->isResolved) {
            $this->keys = $this->configuredKeys() ?? $this->storedKeys() ?? $this->generateAndStoreKeys();
            $this->isResolved = true;
        }

        return $this->keys;
    }

    /** @return array{public_key: string, private_key: string}|null */
    private function configuredKeys(): ?array
    {
        return self::validKeys([
            'public_key' => config('webpush.vapid.public_key'),
            'private_key' => config('webpush.vapid.private_key'),
        ]);
    }

    /** @return array{public_key: string, private_key: string}|null */
    private function storedKeys(): ?array
    {
        return self::validKeys(InstallationConfig::valueOf(self::CONFIG_NAME));
    }

    // Sinh một lần rồi lưu bền: đổi khoá là mọi trình duyệt đã đăng ký mất hiệu lực.
    // Hai tiến trình cùng sinh thì bản ghi nào vào trước thắng (khoá duy nhất theo
    // name), bên thua đọc lại đúng cặp đó.
    /** @return array{public_key: string, private_key: string}|null */
    private function generateAndStoreKeys(): ?array
    {
        try {
            $generated = VAPID::createVapidKeys();
        } catch (Throwable $exception) {
            Log::warning('Web push unavailable: cannot generate VAPID keys', ['error' => $exception->getMessage()]);

            return null;
        }

        $config = InstallationConfig::query()->createOrFirst(
            ['name' => self::CONFIG_NAME],
            [
                'value' => ['public_key' => $generated['publicKey'], 'private_key' => $generated['privateKey']],
                'locked' => true,
            ],
        );

        return self::validKeys($config->value);
    }

    /** @return array{public_key: string, private_key: string}|null */
    private static function validKeys(mixed $candidate): ?array
    {
        if (! is_array($candidate)) {
            return null;
        }

        $publicKey = $candidate['public_key'] ?? null;
        $privateKey = $candidate['private_key'] ?? null;

        if (! is_string($publicKey) || $publicKey === '' || ! is_string($privateKey) || $privateKey === '') {
            return null;
        }

        return ['public_key' => $publicKey, 'private_key' => $privateKey];
    }
}
