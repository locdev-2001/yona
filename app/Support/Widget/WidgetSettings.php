<?php

namespace App\Support\Widget;

use App\Messaging\Structured\Action;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Support\AlertSound\AlertTones;
use Illuminate\Validation\ValidationException;

/**
 * Cấu hình widget của một hộp thư website (cột `channel_web_widgets.widget_settings`):
 * launcher, khối Home bật/tắt, kênh khác, link tuỳ biến, thu thông tin khách.
 * Một nguồn cho giá trị mặc định (widget đọc) và luật chuẩn hoá (dashboard ghi).
 */
final class WidgetSettings
{
    public const CHANNEL_KINDS = ['zalo', 'messenger', 'telegram', 'whatsapp', 'instagram', 'tiktok', 'hotline', 'email', 'custom'];

    public const MAX_CHANNELS = 6;

    public const MAX_LINKS = 5;

    public const DEFAULTS = [
        'appearance' => [
            'launcher' => 'round',
            'launcher_label' => null,
            'position' => 'right',
            'greeting' => null,
        ],
        'home' => [
            'blocks' => [
                'recent_conversation' => true,
                'help' => true,
                'other_channels' => true,
                'custom_links' => true,
                'request' => false,
            ],
        ],
        'other_channels' => [],
        'custom_links' => [],
        'capture' => ['phone' => true, 'email' => true],
        'expanded_enabled' => true,
    ];

    /** Mặc định đầy đủ: như DEFAULTS cộng âm báo tin mới (âm mặc định lấy từ danh sách âm dùng chung). */
    public static function defaults(): array
    {
        return [...self::DEFAULTS, 'notification_sound' => ['enabled' => true, 'tone' => AlertTones::default()]];
    }

    /**
     * Bản dashboard gửi lên trộn nông với bản đang lưu: gửi riêng `appearance` thì các
     * mục khác giữ nguyên. Danh sách (kênh khác, link) luôn thay nguyên cả danh sách.
     *
     * @throws ValidationException
     */
    public static function merge(?array $stored, array $input): array
    {
        return self::normalize([...self::resolve($stored), ...$input]);
    }

    /** Cấu hình đã lưu trộn với mặc định; khoá lạ bị bỏ. */
    public static function resolve(?array $stored): array
    {
        return self::normalize($stored ?? [], strict: false);
    }

    /**
     * Chuẩn hoá dữ liệu dashboard gửi lên. `strict` = báo lỗi thay vì âm thầm bỏ
     * mục sai (dashboard cần biết mình nhập sai gì; đọc cấu hình cũ thì không).
     *
     * @throws ValidationException
     */
    public static function normalize(array $input, bool $strict = true): array
    {
        $appearance = (array) ($input['appearance'] ?? []);
        $blocks = (array) ($input['home']['blocks'] ?? []);
        $capture = (array) ($input['capture'] ?? []);

        return [
            'appearance' => [
                'launcher' => in_array($appearance['launcher'] ?? null, ['round', 'pill'], true) ? $appearance['launcher'] : 'round',
                'launcher_label' => self::text($appearance['launcher_label'] ?? null, 30),
                'position' => in_array($appearance['position'] ?? null, ['left', 'right'], true) ? $appearance['position'] : 'right',
                'greeting' => self::text($appearance['greeting'] ?? null, 80),
            ],
            'home' => ['blocks' => array_map(
                fn (string $key) => (bool) ($blocks[$key] ?? self::DEFAULTS['home']['blocks'][$key]),
                array_combine(array_keys(self::DEFAULTS['home']['blocks']), array_keys(self::DEFAULTS['home']['blocks'])),
            )],
            'other_channels' => self::channels($input['other_channels'] ?? [], $strict),
            'custom_links' => self::links($input['custom_links'] ?? [], $strict),
            'capture' => [
                'phone' => (bool) ($capture['phone'] ?? true),
                'email' => (bool) ($capture['email'] ?? true),
            ],
            'expanded_enabled' => (bool) ($input['expanded_enabled'] ?? true),
            'notification_sound' => self::notificationSound((array) ($input['notification_sound'] ?? []), $strict),
        ];
    }

    /** Âm widget kêu trên website khách khi shop trả lời; âm lạ thì báo lỗi (dashboard) hoặc về âm mặc định. */
    private static function notificationSound(array $sound, bool $strict): array
    {
        $tone = $sound['tone'] ?? AlertTones::default();

        if ($strict && ! in_array($tone, AlertTones::all(), true)) {
            throw ValidationException::withMessages(['notification_sound.tone' => __('messaging.settings.invalid_alert_tone')]);
        }

        return [
            'enabled' => (bool) ($sound['enabled'] ?? true),
            'tone' => AlertTones::orDefault($tone),
        ];
    }

    private static function channels(mixed $raw, bool $strict): array
    {
        $channels = [];

        foreach (array_slice(is_array($raw) ? array_values($raw) : [], 0, self::MAX_CHANNELS) as $index => $channel) {
            $kind = $channel['kind'] ?? null;
            $value = self::text($channel['value'] ?? null, 255);

            if (! in_array($kind, self::CHANNEL_KINDS, true) || $value === null || ! self::validChannelValue($kind, $value)) {
                if ($strict) {
                    throw ValidationException::withMessages(["other_channels.{$index}" => __('messaging.settings.invalid_channel')]);
                }

                continue;
            }

            $channels[] = [
                'kind' => $kind,
                'label' => self::text($channel['label'] ?? null, 40),
                'value' => $value,
                'enabled' => (bool) ($channel['enabled'] ?? true),
            ];
        }

        return $channels;
    }

    private static function links(mixed $raw, bool $strict): array
    {
        $links = [];

        foreach (array_slice(is_array($raw) ? array_values($raw) : [], 0, self::MAX_LINKS) as $index => $link) {
            $label = self::text($link['label'] ?? null, 40);

            try {
                $url = Action::url($link['url'] ?? null);
            } catch (InvalidStructuredPayload) {
                $url = null;
            }

            if ($label === null || $url === null) {
                if ($strict) {
                    throw ValidationException::withMessages(["custom_links.{$index}" => __('messaging.errors.invalid_url')]);
                }

                continue;
            }

            $links[] = ['label' => $label, 'url' => $url];
        }

        return $links;
    }

    /** Hotline là số điện thoại, email là địa chỉ, còn lại là link http(s). */
    private static function validChannelValue(string $kind, string $value): bool
    {
        return match ($kind) {
            'hotline' => preg_match('/^\+?[0-9][0-9 .-]{6,18}[0-9]$/', $value) === 1,
            'email' => filter_var($value, FILTER_VALIDATE_EMAIL) !== false,
            default => (bool) preg_match('#^https?://#i', $value) && filter_var($value, FILTER_VALIDATE_URL) !== false,
        };
    }

    private static function text(mixed $value, int $max): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return mb_substr(trim($value), 0, $max);
    }
}
