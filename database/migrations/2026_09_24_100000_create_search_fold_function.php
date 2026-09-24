<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Dạng so khớp của chữ khi tìm kiếm: bỏ dấu tiếng Việt, đ → d, chữ thường.
// Không dùng extension `unaccent`: PostgreSQL production không có extension này,
// thêm `CREATE EXTENSION unaccent` là deploy chết. Mọi hàm bên trong đều
// IMMUTABLE nên index biểu thức trên search_fold(...) dùng được.
// Luật phải khớp resources/js/shared/helpers/searchFold.ts (cùng kiểm bằng
// searchFold.cases.json). Dải dấu kết hợp viết bằng escape để trình soạn thảo
// chuẩn hoá Unicode không làm hỏng ngầm biểu thức.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION search_fold(input text) RETURNS text
            LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
            AS $$
                SELECT lower(translate(regexp_replace(normalize(input, NFD), '[\u0300-\u036f]', '', 'g'), 'đĐ', 'dD'))
            $$
            SQL);
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS search_fold(text)');
    }
};
