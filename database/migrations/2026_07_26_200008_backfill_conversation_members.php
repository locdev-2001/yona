<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Dựng hàng thành viên từ cột `participants` jsonb sắp bị xóa.
 *
 * Với luồng 1-1 thì thành viên chính là đối phương của luồng, và hàng đó cũng
 * phải có: mọi câu hỏi "người này ở đâu" chỉ được có một đường trả lời.
 */
return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');

        // 1-1: một hàng, mang thẳng hồ sơ của luồng.
        $db->statement(
            "INSERT INTO conversation_members
                (conversation_id, sender_uid, workspace_id, channel_account_id, identity_id, profile_id,
                 first_seen_at, last_seen_at, created_at, updated_at)
             SELECT id, sender_uid, workspace_id, channel_account_id, identity_id, profile_id,
                    created_at, COALESCE(last_message_at, created_at), now(), now()
             FROM conversations
             WHERE thread_kind = 'direct' AND deleted_at IS NULL
             ON CONFLICT (conversation_id, sender_uid) DO NOTHING"
        );

        // Nhóm: mỗi khóa trong jsonb là một thành viên. Chưa gắn hồ sơ — uid của
        // thành viên nhóm sẽ được resolve ở lần họ nhắn tiếp theo.
        $db->statement(
            "INSERT INTO conversation_members
                (conversation_id, sender_uid, workspace_id, channel_account_id,
                 first_seen_at, last_seen_at, created_at, updated_at)
             SELECT c.id, p.key, c.workspace_id, c.channel_account_id,
                    c.created_at, COALESCE(c.last_message_at, c.created_at), now(), now()
             FROM conversations c
             CROSS JOIN LATERAL jsonb_each(COALESCE(c.participants, '{}'::jsonb)) AS p(key, value)
             WHERE c.thread_kind = 'group' AND c.deleted_at IS NULL
             ON CONFLICT (conversation_id, sender_uid) DO NOTHING"
        );

        $remaining = (int) $db->selectOne(
            "SELECT count(*) AS c FROM conversations c
             WHERE c.thread_kind = 'direct' AND c.deleted_at IS NULL
               AND NOT EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id)"
        )->c;

        if ($remaining !== 0) {
            throw new RuntimeException("Dựng thành viên chưa xong: còn {$remaining} luồng 1-1 không có thành viên nào.");
        }
    }

    public function down(): void
    {
        DB::connection('pgsql_privileged')->statement('TRUNCATE conversation_members');
    }
};
