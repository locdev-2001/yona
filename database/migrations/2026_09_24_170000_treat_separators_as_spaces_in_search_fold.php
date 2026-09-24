<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// search_fold coi - _ . / là khoảng trắng: tên tệp "bao-gia_thang-9.pdf" ra khi
// gõ "bao gia thang 9". Mỗi ký tự ngăn cách đổi đúng một khoảng trắng để vị trí
// tô sáng phía giao diện không lệch — luật phải khớp
// resources/js/shared/helpers/searchFold.ts (cùng kiểm bằng searchFold.cases.json).
// Thân hàm đổi thì index biểu thức trên search_fold(...) vẫn giữ dạng cũ nên phải
// dựng lại; CONCURRENTLY để không khoá ghi bảng messages, nên không chạy trong
// transaction.
return new class extends Migration
{
    public $withinTransaction = false;

    private const SEARCH_FOLD_SQL = <<<'SQL'
        CREATE OR REPLACE FUNCTION search_fold(input text) RETURNS text
        LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
        AS $$
            SELECT lower(translate(regexp_replace(normalize(input, NFD), '[̀-ͯ]', '', 'g'), %s))
        $$
        SQL;

    private const FOLDED_INDEXES = [
        'index_messages_on_folded_content',
        'index_messages_on_folded_group_sender_name',
        'index_contacts_on_folded_name',
        'index_attachments_on_folded_display_name',
    ];

    public function up(): void
    {
        DB::statement(sprintf(self::SEARCH_FOLD_SQL, "'đĐ-_./', 'dD    '"));
        $this->rebuildFoldedIndexes();
    }

    public function down(): void
    {
        DB::statement(sprintf(self::SEARCH_FOLD_SQL, "'đĐ', 'dD'"));
        $this->rebuildFoldedIndexes();
    }

    private function rebuildFoldedIndexes(): void
    {
        foreach (self::FOLDED_INDEXES as $name) {
            $this->dropAbandonedRebuilds($name);
            DB::statement("REINDEX INDEX CONCURRENTLY {$name}");
        }
    }

    // Lần REINDEX CONCURRENTLY trước chết giữa chừng để lại bản dựng dở
    // <tên>_ccnew / <tên>_ccold INVALID — vẫn bị cập nhật mỗi lần ghi, và lần chạy
    // lại sẽ đẻ thêm bản khác thay vì dùng lại. Xoá đi trước khi dựng.
    private function dropAbandonedRebuilds(string $name): void
    {
        $abandoned = DB::select(
            'SELECT pg_class.relname AS name FROM pg_index JOIN pg_class ON pg_class.oid = pg_index.indexrelid'
            .' WHERE pg_class.relnamespace = current_schema()::regnamespace AND NOT pg_index.indisvalid'
            .' AND (pg_class.relname LIKE ? OR pg_class.relname LIKE ?)',
            ["{$name}\\_ccnew%", "{$name}\\_ccold%"],
        );

        foreach ($abandoned as $index) {
            DB::statement("DROP INDEX CONCURRENTLY IF EXISTS {$index->name}");
        }
    }
};
