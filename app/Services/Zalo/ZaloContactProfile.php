<?php

namespace App\Services\Zalo;

use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Channel\Zalo;
use App\Models\Contact;

/**
 * Luật làm mới tên/ảnh của liên hệ Zalo (người hoặc nhóm) theo hồ sơ nền tảng — chung
 * cho tin đến và sự kiện nhóm. Builder lõi chỉ ghi tên/ảnh lúc TẠO hồ sơ (đúng gốc:
 * `contact_inbox_with_contact_builder.rb` trả về sớm theo `source_id`).
 */
class ZaloContactProfile
{
    private const PLATFORM_NAME_ATTRIBUTE = 'social_zalo_user_name';

    /**
     * @param  bool  $avatarChanged  nền tảng báo ảnh đã đổi: tải lại cả khi liên hệ đã có ảnh
     *                               (job tự bỏ qua URL đã gắn); không thì chỉ lấp ảnh còn trống
     */
    public function refresh(Contact $contact, string $threadUid, ?string $name, ?string $avatarUrl, bool $isGroup, bool $avatarChanged = false): void
    {
        $attributes = $contact->additional_attributes ?? [];

        if ($name !== null && $this->nameComesFromPlatform($contact)) {
            $contact->name = $name;
        }

        $contact->additional_attributes = array_filter([
            ...$attributes,
            'social_zalo_user_id' => $attributes['social_zalo_user_id'] ?? $threadUid,
            self::PLATFORM_NAME_ATTRIBUTE => $name ?? ($attributes[self::PLATFORM_NAME_ATTRIBUTE] ?? null),
            // Hồ sơ của một NHÓM mang tên + ảnh nhóm; đánh dấu để panel liên hệ / báo cáo
            // phân biệt được với người thật.
            Zalo::CONTACT_THREAD_KIND_ATTRIBUTE => $isGroup
                ? Zalo::CONTACT_THREAD_KIND_GROUP
                : ($attributes[Zalo::CONTACT_THREAD_KIND_ATTRIBUTE] ?? null),
        ]);

        if ($contact->isDirty()) {
            $contact->save();
        }

        if ($avatarUrl !== null && ($contact->avatar === null || ($avatarChanged && ! $this->isAttachedAvatar($contact, $avatarUrl)))) {
            AvatarFromUrlJob::dispatch($contact, $avatarUrl);
        }
    }

    /**
     * Chỉ ghi đè tên do NỀN TẢNG đặt: tên ẩn danh builder sinh khi lô lịch sử không kèm
     * hồ sơ (nhận ra vì chưa lần nào lưu được tên Zalo), hoặc chính tên Zalo lần trước.
     * Tên người dùng sửa tay không bị đụng.
     */
    private function nameComesFromPlatform(Contact $contact): bool
    {
        $stored = trim((string) ($contact->additional_attributes[self::PLATFORM_NAME_ATTRIBUTE] ?? ''));

        return $stored === '' || trim((string) $contact->name) === $stored;
    }

    /** AvatarFromUrlJob ghi băm URL đã gắn thành công; cùng URL thì không tải lại. */
    private function isAttachedAvatar(Contact $contact, string $avatarUrl): bool
    {
        return ($contact->additional_attributes['avatar_url_hash'] ?? null) === hash('sha256', $avatarUrl);
    }
}
