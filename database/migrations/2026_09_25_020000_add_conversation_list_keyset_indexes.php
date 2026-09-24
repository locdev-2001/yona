<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Danh sách hội thoại lọc theo account (+ hộp thư) + trạng thái rồi xếp
// (last_activity_at, id) giảm dần; index ghép khớp đúng thứ tự đó để trang đầu
// lẫn trang theo con trỏ chỉ đọc đúng số dòng cần.
// CONCURRENTLY để không khoá ghi bảng conversations khi deploy, nên không chạy
// trong transaction.
return new class extends Migration
{
    public $withinTransaction = false;

    private const INDEXES = [
        'index_conversations_on_account_status_activity' => 'conversations (account_id, status, last_activity_at DESC, id DESC)',
        'index_conversations_on_account_inbox_status_activity' => 'conversations (account_id, inbox_id, status, last_activity_at DESC, id DESC)',
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $name => $definition) {
            $this->dropIfInvalid($name);
            DB::statement("CREATE INDEX CONCURRENTLY IF NOT EXISTS {$name} ON {$definition}");
        }
    }

    public function down(): void
    {
        foreach (array_keys(self::INDEXES) as $name) {
            DB::statement("DROP INDEX CONCURRENTLY IF EXISTS {$name}");
        }
    }

    // Lần build CONCURRENTLY trước chết giữa chừng để lại index INVALID, và
    // `IF NOT EXISTS` sẽ bỏ qua nó — phải xoá đi để dựng lại.
    private function dropIfInvalid(string $name): void
    {
        $invalid = DB::selectOne(
            'SELECT 1 AS invalid FROM pg_index JOIN pg_class ON pg_class.oid = pg_index.indexrelid'
            .' WHERE pg_class.relname = ? AND pg_class.relnamespace = current_schema()::regnamespace'
            .' AND NOT pg_index.indisvalid',
            [$name],
        );

        if ($invalid !== null) {
            DB::statement("DROP INDEX CONCURRENTLY IF EXISTS {$name}");
        }
    }
};
