<?php

namespace App\Services\Admin\Operations;

use App\Models\SuperAdminAuditLog;

// Bảng duy nhất đổi mẫu route trong nhật ký thao tác (`POST api/accounts/{accountId}/sticker_packs`)
// thành câu đọc được. Dùng chung cho dòng thời gian của account 360 (AccountActivity) và
// trang Nhật ký thao tác; mẫu route thô vẫn lưu nguyên trong DB.
final class AuditActionDescriber
{
    // Mẫu route (đã bỏ tiền tố api/) → khoá câu mô tả.
    public const ACTIONS = [
        // Account và kho sticker riêng của account (câu ở ACCOUNT_OVERVIEW.AUDIT).
        'PUT accounts/{id}' => 'account_updated',
        'PATCH accounts/{id}' => 'account_updated',
        'DELETE accounts/{id}' => 'account_deleted',
        'POST accounts/{id}/reset_cache' => 'cache_reset',
        'POST accounts/{id}/unsuspend' => 'unsuspended',
        'POST accounts/{id}/suspend' => 'suspended',
        'POST accounts/{accountId}/sticker_packs' => 'pack_created',
        'PUT accounts/{accountId}/sticker_packs/{packId}' => 'pack_updated',
        'PATCH accounts/{accountId}/sticker_packs/{packId}' => 'pack_updated',
        'DELETE accounts/{accountId}/sticker_packs/{packId}' => 'pack_deleted',
        'POST accounts/{accountId}/sticker_packs/{packId}/move' => 'pack_moved',
        'POST accounts/{accountId}/sticker_packs/{packId}/publish' => 'pack_published',
        'POST accounts/{accountId}/sticker_packs/{packId}/unpublish' => 'pack_unpublished',
        'POST accounts/{accountId}/sticker_packs/{packId}/stickers' => 'stickers_added',
        'PUT accounts/{accountId}/sticker_packs/{packId}/stickers/order' => 'stickers_reordered',
        'PATCH accounts/{accountId}/sticker_packs/{packId}/stickers/{stickerId}' => 'stickers_updated',
        'DELETE accounts/{accountId}/sticker_packs/{packId}/stickers/{stickerId}' => 'stickers_deleted',

        // Kho sticker chung và phần còn lại của console (câu ở AUDIT_LOGS.ACTIONS).
        'POST sticker_packs' => 'platform_pack_created',
        'PUT sticker_packs/{packId}' => 'platform_pack_updated',
        'PATCH sticker_packs/{packId}' => 'platform_pack_updated',
        'DELETE sticker_packs/{packId}' => 'platform_pack_deleted',
        'POST sticker_packs/{packId}/publish' => 'platform_pack_published',
        'POST sticker_packs/{packId}/unpublish' => 'platform_pack_unpublished',
        'POST sticker_packs/{packId}/stickers' => 'platform_stickers_added',
        'PUT sticker_packs/{packId}/stickers/order' => 'platform_stickers_reordered',
        'PATCH sticker_packs/{packId}/stickers/{stickerId}' => 'platform_stickers_updated',
        'DELETE sticker_packs/{packId}/stickers/{stickerId}' => 'platform_stickers_deleted',
        'POST accounts' => 'account_created',
        'POST account_users' => 'member_added',
        'DELETE account_users/{id}' => 'member_removed',
        'POST users' => 'user_created',
        'PUT users/{id}' => 'user_updated',
        'PATCH users/{id}' => 'user_updated',
        'DELETE users/{id}' => 'user_deleted',
        'DELETE users/{id}/avatar' => 'avatar_deleted',
        'POST users/{id}/impersonate' => 'impersonated',
        'POST users/{id}/resend_confirmation' => 'confirmation_resent',
        'POST agent_bots' => 'agent_bot_created',
        'PUT agent_bots/{id}' => 'agent_bot_updated',
        'PATCH agent_bots/{id}' => 'agent_bot_updated',
        'DELETE agent_bots/{id}' => 'agent_bot_deleted',
        'DELETE agent_bots/{id}/avatar' => 'avatar_deleted',
        'POST platform_apps' => 'platform_app_created',
        'PUT platform_apps/{id}' => 'platform_app_updated',
        'PATCH platform_apps/{id}' => 'platform_app_updated',
        'DELETE platform_apps/{id}' => 'platform_app_deleted',
        'POST access_tokens' => 'access_token_created',
        'PUT access_tokens/{id}' => 'access_token_updated',
        'PATCH access_tokens/{id}' => 'access_token_updated',
        'DELETE access_tokens/{id}' => 'access_token_deleted',
        'POST installation_configs' => 'installation_config_created',
        'PUT installation_configs/{id}' => 'installation_config_updated',
        'PATCH installation_configs/{id}' => 'installation_config_updated',
        'DELETE installation_configs/{id}' => 'installation_config_deleted',
        'POST app_config' => 'app_config_saved',
        'PUT dashboard/layout' => 'layout_saved',
        'DELETE dashboard/layout' => 'layout_reset',
        'POST mfa' => 'mfa_enabled',
        'POST mfa/verify' => 'mfa_verified',
        'PATCH alerts/rules/{key}' => 'alert_rule_updated',
        'POST alerts/test' => 'alert_test_sent',
        'POST api/push_subscriptions' => 'push_subscribed',
        'DELETE api/push_subscriptions' => 'push_unsubscribed',
    ];

    // Nơi tìm câu theo thứ tự: câu theo ngữ cảnh account trước, rồi câu chung của nhật ký.
    private const SENTENCE_NAMESPACES = ['admin_operations.ACCOUNT_OVERVIEW.AUDIT', 'admin_operations.AUDIT_LOGS.ACTIONS'];

    public static function normalize(string $action): string
    {
        return (string) preg_replace('#^(\w+) api/#', '$1 ', str_replace('-', '_', trim($action)));
    }

    /** Khoá câu mô tả, null khi route chưa có trong bảng. */
    public static function key(string $action): ?string
    {
        return self::ACTIONS[self::normalize($action)] ?? null;
    }

    /** Câu của một khoá; `pack` chọn biến thể có tên bộ sticker, `count` cho thao tác gộp. */
    public static function sentence(string $key, ?string $pack = null, int $count = 1): ?string
    {
        $variant = $pack === null ? 'NO_PACK' : 'PACK';
        $replace = ['count' => (string) $count, 'pack' => (string) $pack];

        foreach (self::SENTENCE_NAMESPACES as $namespace) {
            foreach (["{$namespace}.{$key}.{$variant}", "{$namespace}.{$key}"] as $candidate) {
                $text = __($candidate, $replace);
                if (is_string($text) && $text !== $candidate) {
                    return $text;
                }
            }
        }

        return null;
    }

    /** Một dòng của trang Nhật ký thao tác; route chưa có câu thì giữ nguyên chuỗi gốc. */
    public static function describe(SuperAdminAuditLog|string $log): string
    {
        $action = $log instanceof SuperAdminAuditLog ? (string) $log->action : $log;
        $key = self::key($action);
        $name = $log instanceof SuperAdminAuditLog ? ($log->changes['name'] ?? null) : null;
        $pack = $key !== null && str_contains($key, 'pack') && is_string($name) && $name !== '' ? $name : null;

        return ($key === null ? null : self::sentence($key, $pack)) ?? $action;
    }

    public static function subject(?string $type, ?int $id): ?string
    {
        if ($type === null) {
            return null;
        }

        $label = self::subjectTypeLabel($type);

        return $id === null ? $label : "{$label} #{$id}";
    }

    public static function subjectTypeLabel(string $type): string
    {
        $key = "admin_operations.AUDIT_LOGS.SUBJECTS.{$type}";

        return __($key) === $key ? $type : (string) __($key);
    }

    /** Nhãn kết quả theo mã HTTP: 2xx/3xx là thành công (biểu mẫu chuyển hướng sau khi lưu). */
    public static function status(?int $status): ?string
    {
        return match (true) {
            $status === null => null,
            $status >= 500 => (string) __('admin_operations.AUDIT_LOGS.RESULT.failed'),
            $status >= 400 => (string) __('admin_operations.AUDIT_LOGS.RESULT.rejected'),
            default => (string) __('admin_operations.AUDIT_LOGS.RESULT.success'),
        };
    }
}
