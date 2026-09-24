<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Bản gốc (schema.rb `precision: nil` / Rails 7 `precision: 6`) lưu timestamp
// 6 số lẻ; Laravel `timestamps()` mặc định precision 0 làm nhiều bản ghi cùng
// giây thành tie khi order by created_at. Nâng mọi cột timestamp hiện có lên
// timestamp(6); migration mới phải khai báo `timestamps(6)` / `timestamp('x', 6)`.
return new class extends Migration
{
    public function up(): void
    {
        foreach ($this->columnsWithPrecisionOtherThan(6) as $column) {
            DB::statement(sprintf(
                'ALTER TABLE %s ALTER COLUMN %s TYPE timestamp(6) without time zone',
                $column->table_name,
                $column->column_name,
            ));
        }
    }

    public function down(): void
    {
        foreach ($this->columnsWithPrecisionOtherThan(0) as $column) {
            DB::statement(sprintf(
                'ALTER TABLE %s ALTER COLUMN %s TYPE timestamp(0) without time zone',
                $column->table_name,
                $column->column_name,
            ));
        }
    }

    /** @return array<int, object{table_name: string, column_name: string}> */
    private function columnsWithPrecisionOtherThan(int $precision): array
    {
        return DB::select(
            "SELECT table_name, column_name
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND data_type = 'timestamp without time zone'
               AND datetime_precision <> ?
             ORDER BY table_name, column_name",
            [$precision],
        );
    }
};
