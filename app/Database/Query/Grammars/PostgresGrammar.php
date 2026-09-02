<?php

namespace App\Database\Query\Grammars;

use Illuminate\Database\Query\Grammars\PostgresGrammar as BasePostgresGrammar;

// Rails ghi datetime với micro-giây (cột timestamp(6)); Laravel mặc định
// 'Y-m-d H:i:s' cắt phần lẻ ngay lúc ghi dù cột có precision. Ghi đủ 6 số lẻ
// để order by created_at giữ đúng thứ tự tạo khi nhiều bản ghi cùng giây.
class PostgresGrammar extends BasePostgresGrammar
{
    public function getDateFormat(): string
    {
        return 'Y-m-d H:i:s.u';
    }
}
