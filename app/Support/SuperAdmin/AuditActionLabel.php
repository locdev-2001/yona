<?php

namespace App\Support\SuperAdmin;

// Câu mô tả một dòng nhật ký thao tác cho người đọc: `POST api/sticker_packs/{packId}/stickers`
// thành "Tạo sticker", `POST accounts/{id}/suspend` thành "Khoá tài khoản". Mẫu route
// thô vẫn lưu nguyên trong DB và hiện ở phần chi tiết của dòng.
final class AuditActionLabel
{
    public static function describe(string $action): string
    {
        [$method, $path] = array_pad(explode(' ', trim($action), 2), 2, '');
        $method = strtoupper($method);

        // Đoạn tĩnh (bỏ `api` và tham số `{id}`), đoạn cuối là thứ bị tác động.
        $segments = array_values(array_filter(
            explode('/', $path),
            fn (string $segment) => $segment !== '' && $segment !== 'api' && ! str_starts_with($segment, '{'),
        ));
        $last = end($segments) ?: '';

        $special = "admin_layout.audit.actions.{$method} {$last}";
        if (__($special) !== $special) {
            return __($special);
        }

        $verb = "admin_layout.audit.verbs.{$method}";
        $object = "admin_layout.audit.objects.{$last}";

        // Route chưa có bản dịch thì giữ nguyên chuỗi gốc, không đoán nghĩa.
        if ($last === '' || __($verb) === $verb || __($object) === $object) {
            return $action;
        }

        return str_replace('{object}', __($object), __($verb));
    }

    public static function subject(?string $type, ?int $id): ?string
    {
        if ($type === null) {
            return null;
        }

        $key = "admin_layout.audit.subjects.{$type}";
        $label = __($key) === $key ? str_replace('_', ' ', $type) : __($key);

        return $id === null ? $label : "{$label} #{$id}";
    }

    /** Nhãn kết quả theo mã HTTP: 2xx/3xx là thành công (biểu mẫu chuyển hướng sau khi lưu). */
    public static function status(?int $status): ?string
    {
        return match (true) {
            $status === null => null,
            $status >= 500 => __('admin_layout.audit.status.failed'),
            $status >= 400 => __('admin_layout.audit.status.rejected'),
            default => __('admin_layout.audit.status.success'),
        };
    }

    public static function subjectTypeLabel(string $type): string
    {
        $key = "admin_layout.audit.subjects.{$type}";

        return __($key) === $key ? $type : __($key);
    }
}
