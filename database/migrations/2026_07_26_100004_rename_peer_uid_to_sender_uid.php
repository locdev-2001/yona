<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `peer_uid` → `sender_uid` — một khái niệm, một từ (§0.7).
 *
 * `sender` là người ở đầu bên kia gửi tới kênh này. `peer` là từ thứ hai cho
 * cùng thứ đó, và nó còn lẫn với `peer` của mạng ngang hàng.
 *
 * CHỈ đổi tên đúng một cột. Sáu cột `peer_*` còn lại (`peer_name`,
 * `peer_avatar_url`, `peer_phone`, `phone_source`, `phone_verified_at`,
 * `phone_enriched_at`) KHÔNG đổi tên: chúng bị XÓA ở pha định danh, thay bằng
 * `profile_identities`. Đổi tên rồi xóa là chạm hai lần cùng một chỗ.
 *
 * Ràng buộc duy nhất mang tên cột cũ được đổi theo. `RENAME` là thao tác trên
 * catalog, không viết lại bảng, nên không khóa lâu.
 *
 * Payload của bridge giữ nguyên `peer_uid`: đó là ranh giới nền tảng, adapter
 * dịch — đúng luật "đặc thù nhà cung cấp sống trong adapter".
 */
return new class extends Migration
{
    public function up(): void
    {
        $connection = DB::connection('pgsql_privileged');
        $schema = $connection->getSchemaBuilder();
        $hasPeerUid = $schema->hasColumn('conversations', 'peer_uid');
        $hasSenderUid = $schema->hasColumn('conversations', 'sender_uid');

        if ($hasPeerUid === $hasSenderUid) {
            throw new RuntimeException(
                'Expected conversations to contain exactly one of peer_uid or sender_uid.'
            );
        }

        // Existing installations still have peer_uid. Fresh installations use
        // the canonical sender_uid name directly in the create-table migration.
        if ($hasPeerUid) {
            $connection->statement('ALTER TABLE conversations RENAME COLUMN peer_uid TO sender_uid');
        }

        $connection->statement(
            'ALTER INDEX IF EXISTS conversations_channel_account_peer_unique
             RENAME TO conversations_channel_account_sender_unique'
        );
    }

    public function down(): void
    {
        $connection = DB::connection('pgsql_privileged');

        $connection->statement(
            'ALTER INDEX IF EXISTS conversations_channel_account_sender_unique
             RENAME TO conversations_channel_account_peer_unique'
        );
        $connection->statement('ALTER TABLE conversations RENAME COLUMN sender_uid TO peer_uid');
    }
};
