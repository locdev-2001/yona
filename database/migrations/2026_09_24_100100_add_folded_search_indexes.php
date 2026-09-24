<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Index trigram trên dạng đã bỏ dấu của các cột tìm kiếm. Biểu thức ở đây phải
// trùng biểu thức SearchService dựng (SearchTerm::foldedMatch + hằng cột), nếu
// lệch planner im lặng quét cả bảng — tests/Feature/Database/SearchFoldTest.php
// khoá bằng EXPLAIN.
// CONCURRENTLY để không khoá ghi bảng messages khi deploy, nên không chạy trong
// transaction.
return new class extends Migration
{
    public $withinTransaction = false;

    private const INDEXES = [
        'index_messages_on_folded_content' => 'messages USING gin (search_fold(content) gin_trgm_ops)',
        'index_messages_on_folded_group_sender_name' => "messages USING gin (search_fold(content_attributes #>> '{sender,name}') gin_trgm_ops)",
        'index_contacts_on_folded_name' => 'contacts USING gin (search_fold(name) gin_trgm_ops)',
        'index_attachments_on_folded_display_name' => "attachments USING gin (search_fold(COALESCE(NULLIF(filename, ''), fallback_title)) gin_trgm_ops)",
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
