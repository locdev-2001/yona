<?php

namespace App\Services\Users;

use Illuminate\Validation\Rule;

// Cài đặt riêng tư của người dùng (cột users.privacy). Khoá thiếu lấy mặc định ở đây.
final class PrivacySettings
{
    public const GROUP_ADD_EVERYONE = 'everyone';

    public const GROUP_ADD_NOBODY = 'nobody';

    private const DEFAULTS = [
        'group_add' => self::GROUP_ADD_EVERYONE,
        'show_last_seen' => true,
    ];

    /** @return array{group_add: string, show_last_seen: bool} */
    public static function resolve(?array $stored): array
    {
        return array_merge(self::DEFAULTS, array_intersect_key($stored ?? [], self::DEFAULTS));
    }

    /** @return array<string, list<mixed>> */
    public static function rules(): array
    {
        return [
            'privacy' => ['sometimes', 'array'],
            'privacy.group_add' => ['sometimes', Rule::in([self::GROUP_ADD_EVERYONE, self::GROUP_ADD_NOBODY])],
            'privacy.show_last_seen' => ['sometimes', 'boolean'],
        ];
    }
}
