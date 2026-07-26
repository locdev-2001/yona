<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Dựng hồ sơ + bí danh cho mọi hội thoại đã có.
 *
 * Thứ tự gộp đi từ nguồn tin cậy nhất xuống: số điện thoại đã biết trước, rồi
 * mới tới uid của kênh. Khách chưa có số thì thành một hồ sơ riêng, chưa định
 * danh — đúng như một khách lạ vừa nhắn lần đầu.
 *
 * Ghim `pgsql_privileged`: `conversations` bật FORCE RLS và migration chạy ngoài
 * ngữ cảnh request, nên dưới role thường thì không hàng nào nhìn thấy được và
 * lệnh "thành công" với 0 hàng, không một dòng log.
 */
return new class extends Migration
{
    public $withinTransaction = false;

    private const BATCH = 500;

    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');

        do {
            $rows = $db->select(
                "SELECT id, workspace_id, channel, channel_account_id, sender_uid, peer_name,
                        peer_avatar_url, peer_phone, thread_kind
                 FROM conversations
                 WHERE profile_id IS NULL AND thread_kind = 'direct' AND deleted_at IS NULL
                 LIMIT ".self::BATCH
            );

            foreach ($rows as $row) {
                $profileId = $this->resolveProfile($db, $row);
                $identityId = $this->upsertChannelIdentity($db, $row, $profileId);

                $db->update(
                    'UPDATE conversations SET profile_id = ?, identity_id = ?,
                            thread_name = COALESCE(thread_name, peer_name),
                            thread_avatar = COALESCE(thread_avatar, peer_avatar_url)
                     WHERE id = ?',
                    [$profileId, $identityId, $row->id]
                );
            }
        } while ($rows !== []);

        // Luồng nhóm không có hồ sơ — chỉ chép tên nhóm sang cột của chính luồng.
        $db->update("UPDATE conversations
                     SET thread_name = COALESCE(thread_name, peer_name),
                         thread_avatar = COALESCE(thread_avatar, peer_avatar_url)
                     WHERE thread_kind = 'group'");

        $remaining = (int) $db->selectOne(
            "SELECT count(*) AS c FROM conversations
             WHERE profile_id IS NULL AND thread_kind = 'direct' AND deleted_at IS NULL"
        )->c;

        if ($remaining !== 0) {
            throw new RuntimeException("Dựng hồ sơ chưa xong: còn {$remaining} luồng 1-1 chưa có hồ sơ.");
        }
    }

    public function down(): void
    {
        // Không gỡ: dữ liệu định danh đã dựng có thể đã được người dùng sửa tay.
        // Muốn quay đầu thì gỡ cột ở migration tạo cột, không gỡ ở đây.
    }

    private function resolveProfile(object $db, object $row): string
    {
        $phone = $this->normalizePhone($row->peer_phone);

        // Số điện thoại là khóa mạnh nhất: đã có hồ sơ mang số này thì dùng lại.
        if ($phone !== null) {
            $existing = $db->selectOne(
                'SELECT profile_id FROM profile_identities
                 WHERE workspace_id = ? AND key = ? AND value = ? AND channel_account_id IS NULL',
                [$row->workspace_id, 'phone', $phone]
            );

            if ($existing !== null) {
                return $existing->profile_id;
            }
        }

        $profileId = (string) Str::uuid();
        $db->insert(
            'INSERT INTO profiles (id, workspace_id, is_identified, first_seen_at, last_seen_at, custom_fields, created_at, updated_at)
             VALUES (?, ?, ?, now(), now(), ?, now(), now())',
            [$profileId, $row->workspace_id, $phone !== null, '{}']
        );

        if ($phone !== null) {
            $db->insert(
                'INSERT INTO profile_identities
                    (id, workspace_id, profile_id, key, value, source, channels, display_name,
                     channel_profiles, attributes, is_verified, first_seen_at, last_seen_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now(), now(), now())',
                [(string) Str::uuid(), $row->workspace_id, $profileId, 'phone', $phone, 'backfill',
                    json_encode([$row->channel]), $row->peer_name, '{}', '{}', false]
            );
        }

        return $profileId;
    }

    private function upsertChannelIdentity(object $db, object $row, string $profileId): string
    {
        $key = $row->channel.'_uid';

        $existing = $db->selectOne(
            'SELECT id FROM profile_identities
             WHERE channel_account_id IS NOT DISTINCT FROM ? AND key = ? AND value = ?',
            [$row->channel_account_id, $key, $row->sender_uid]
        );

        if ($existing !== null) {
            return $existing->id;
        }

        $identityId = (string) Str::uuid();
        $db->insert(
            'INSERT INTO profile_identities
                (id, workspace_id, profile_id, key, value, source, channel_account_id, channels,
                 display_name, channel_profiles, attributes, is_verified, first_seen_at, last_seen_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now(), now(), now())',
            [$identityId, $row->workspace_id, $profileId, $key, $row->sender_uid, 'backfill',
                $row->channel_account_id, json_encode([$row->channel]), $row->peer_name, '{}', '{}', false]
        );

        return $identityId;
    }

    private function normalizePhone(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if (strlen($digits) === 11 && str_starts_with($digits, '84')) {
            $digits = '0'.substr($digits, 2);
        }

        if (strlen($digits) === 9 && ! str_starts_with($digits, '0')) {
            $digits = '0'.$digits;
        }

        return strlen($digits) === 10 && str_starts_with($digits, '0') ? $digits : null;
    }
};
