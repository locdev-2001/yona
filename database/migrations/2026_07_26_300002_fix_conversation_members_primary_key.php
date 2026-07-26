<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cho `conversation_members` một khóa chính MỘT CỘT, và sửa lại dữ liệu đã hỏng.
 *
 * Bảng này ra đời với khóa chính tổ hợp `(conversation_id, sender_uid)`. Eloquent
 * KHÔNG hỗ trợ khóa tổ hợp: model khai `$primaryKey = null` thì `save()` trên một
 * hàng đã có sinh ra `UPDATE` không có mệnh đề `WHERE` dùng được — mỗi lần ghi
 * một thành viên là ghi đè TOÀN BỘ bảng.
 *
 * Hậu quả quan sát được: mọi thành viên của mọi nhóm trỏ vào cùng một bí danh,
 * nên giao diện hiện sai tên và sai avatar cho người gửi.
 *
 * Ràng buộc duy nhất `(conversation_id, sender_uid)` được giữ — nó vẫn là khóa
 * nghiệp vụ. Chỉ khóa CHÍNH đổi thành một cột, để Eloquent nhắm đúng một hàng.
 */
return new class extends Migration
{
    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');

        if (! Schema::hasColumn('conversation_members', 'id')) {
            $db->statement('ALTER TABLE conversation_members ADD COLUMN id uuid');
            $db->statement('UPDATE conversation_members SET id = gen_random_uuid() WHERE id IS NULL');
            $db->statement('ALTER TABLE conversation_members ALTER COLUMN id SET NOT NULL');
            $db->statement('ALTER TABLE conversation_members DROP CONSTRAINT conversation_members_pkey');
            $db->statement('ALTER TABLE conversation_members ADD PRIMARY KEY (id)');
            $db->statement('CREATE UNIQUE INDEX conversation_members_conversation_sender_unique
                            ON conversation_members (conversation_id, sender_uid)');
        }

        // Sửa dữ liệu đã bị ghi đè: nối lại từng thành viên với bí danh ĐÚNG của
        // họ, tra theo (tài khoản kênh, khóa thô). Bí danh vẫn còn nguyên — chỉ
        // cái trỏ tới nó bị hỏng.
        $db->statement(
            "UPDATE conversation_members m
             SET identity_id = i.id, profile_id = i.profile_id
             FROM profile_identities i, conversations c
             WHERE m.conversation_id = c.id
               AND i.key = c.channel || '_uid'
               AND i.value = m.sender_uid
               AND i.channel_account_id IS NOT DISTINCT FROM m.channel_account_id"
        );

        // Thành viên không tra ra bí danh nào thì bỏ trống, đừng để nguyên giá
        // trị sai — hiện sai tên còn tệ hơn không hiện tên.
        $db->statement(
            'UPDATE conversation_members m
             SET identity_id = NULL, profile_id = NULL
             WHERE m.identity_id IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1 FROM profile_identities i, conversations c
                   WHERE m.conversation_id = c.id
                     AND i.id = m.identity_id
                     AND i.value = m.sender_uid
               )'
        );
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');
        $db->statement('DROP INDEX IF EXISTS conversation_members_conversation_sender_unique');
        $db->statement('ALTER TABLE conversation_members DROP CONSTRAINT conversation_members_pkey');
        $db->statement('ALTER TABLE conversation_members DROP COLUMN id');
        $db->statement('ALTER TABLE conversation_members ADD PRIMARY KEY (conversation_id, sender_uid)');
    }
};
