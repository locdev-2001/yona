<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Mảng JSON (cột jsonb vẫn là JSON hợp lệ) trong đó CHỈ các khoá bí mật được mã hoá
 * (vd `access_token`, `refresh_token`). Giá trị cũ chưa mã hoá vẫn đọc được — lần lưu
 * kế tiếp sẽ mã hoá lại. Dùng: `EncryptedSecretsArray::class.':access_token,refresh_token'`.
 *
 * @implements CastsAttributes<array<string, mixed>, array<string, mixed>>
 */
class EncryptedSecretsArray implements CastsAttributes
{
    /** @var list<string> */
    private readonly array $secretKeys;

    public function __construct(string ...$secretKeys)
    {
        $this->secretKeys = array_values($secretKeys);
    }

    public function get(Model $model, string $key, mixed $value, array $attributes): array
    {
        $decoded = is_string($value) ? json_decode($value, true) : $value;

        if (! is_array($decoded)) {
            return [];
        }

        foreach ($this->secretKeys as $secretKey) {
            if (is_string($decoded[$secretKey] ?? null)) {
                $decoded[$secretKey] = $this->decrypt($decoded[$secretKey]);
            }
        }

        return $decoded;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): array
    {
        $array = is_array($value) ? $value : (array) json_decode((string) $value, true);

        foreach ($this->secretKeys as $secretKey) {
            if (is_string($array[$secretKey] ?? null) && $array[$secretKey] !== '') {
                $array[$secretKey] = Crypt::encryptString($array[$secretKey]);
            }
        }

        return [$key => json_encode($array, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
    }

    private function decrypt(string $value): string
    {
        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            return $value;
        }
    }
}
