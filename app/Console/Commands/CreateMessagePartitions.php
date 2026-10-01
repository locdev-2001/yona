<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Tạo sẵn partition tháng của bảng messages (tháng này tới N tháng sau).
 * Tháng nào đã có thì bỏ qua, nên chạy lại bao nhiêu lần cũng được.
 *
 * Tin của tháng chưa có partition rơi vào messages_default; PostgreSQL không cho
 * tạo partition trùng khoảng với dòng đang nằm ở DEFAULT, nên tháng đó bị bỏ qua
 * kèm cảnh báo (lệnh trả mã lỗi để lịch chạy báo ra) thay vì làm hỏng cả lượt.
 */
class CreateMessagePartitions extends Command
{
    protected $signature = 'messages:create-partitions
        {--months=3 : Số tháng tới cần có partition, tính thêm tháng hiện tại}';

    protected $description = 'Tạo partition theo tháng cho bảng messages';

    public function handle(): int
    {
        if (! DB::scalar("SELECT EXISTS (SELECT 1 FROM pg_partitioned_table WHERE partrelid = to_regclass('messages'))")) {
            $this->components->error('Bảng messages chưa chia partition.');

            return self::FAILURE;
        }

        $created = [];
        $blocked = [];
        $month = Carbon::now()->startOfMonth();
        $last = $month->copy()->addMonths(max(0, (int) $this->option('months')));

        for (; $month->lte($last); $month = $month->copy()->addMonth()) {
            $name = 'messages_p'.$month->format('Y_m');
            $from = $month->toDateTimeString();
            $to = $month->copy()->addMonth()->toDateTimeString();

            if (DB::scalar('SELECT to_regclass(?) IS NOT NULL', [$name])) {
                continue;
            }

            if (DB::scalar('SELECT EXISTS (SELECT 1 FROM messages_default WHERE created_at >= ? AND created_at < ?)', [$from, $to])) {
                $blocked[] = $name;

                continue;
            }

            DB::statement("CREATE TABLE {$name} PARTITION OF messages FOR VALUES FROM ('{$from}') TO ('{$to}')");
            $created[] = $name;
        }

        $this->components->info($created === [] ? 'Không cần tạo partition mới.' : 'Đã tạo '.implode(', ', $created).'.');

        if ($blocked !== []) {
            $this->components->warn('Bỏ qua vì messages_default đang giữ tin của tháng đó: '.implode(', ', $blocked).'.');

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
