<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Bước 2/3 — điền `thread_kind` cho mọi hàng đã có.
 *
 * Hai thứ ở đây không phải tùy chọn:
 *
 * 1. **Ghim `pgsql_privileged`.** `conversations` bật FORCE ROW LEVEL SECURITY, và
 *    role chạy mặc định (`yona_app`) KHÔNG có BYPASSRLS. Chạy migration ngoài
 *    ngữ cảnh request thì `app.current_workspace` rỗng ⇒ predicate NULL ⇒ không
 *    hàng nào nhìn thấy được ⇒ `UPDATE` báo thành công với 0 hàng, thoát 0, không
 *    một dòng log. Mọi hội thoại nhóm sẽ thành `direct` vĩnh viễn.
 *
 * 2. **Chạy ngoài transaction, theo lô.** Một `UPDATE` toàn bảng cộng
 *    `CREATE INDEX` trong một transaction sẽ khóa `conversations`; webhook tin
 *    đến lúc đó bị chặn tới mức bridge timeout, và tin vào bị mất — vi phạm
 *    thẳng bất biến "luôn nhận inbound".
 */
return new class extends Migration
{
    public $withinTransaction = false;

    private const BATCH = 1000;

    public function up(): void
    {
        $connection = DB::connection('pgsql_privileged');

        do {
            $affected = $connection->update(
                'UPDATE conversations SET thread_kind = CASE WHEN thread_type = 1 THEN \'group\' ELSE \'direct\' END
                 WHERE id IN (SELECT id FROM conversations WHERE thread_kind IS NULL LIMIT '.self::BATCH.')'
            );
        } while ($affected > 0);

        // Không tin vào việc vòng lặp đã chạy: đếm lại. Đây là chốt chặn duy nhất
        // bắt được trường hợp UPDATE chạy dưới role sai và "thành công" với 0 hàng.
        $remaining = (int) $connection->selectOne(
            'SELECT count(*) AS c FROM conversations WHERE thread_kind IS NULL'
        )->c;

        if ($remaining !== 0) {
            throw new RuntimeException("Điền thread_kind chưa xong: còn {$remaining} hàng rỗng.");
        }

        $connection->statement(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_ws_thread_kind_idx
             ON conversations (workspace_id, thread_kind)'
        );
    }

    public function down(): void
    {
        DB::connection('pgsql_privileged')
            ->statement('DROP INDEX CONCURRENTLY IF EXISTS conversations_ws_thread_kind_idx');
    }
};
