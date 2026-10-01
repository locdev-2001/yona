<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Models\Message;
use App\Models\User;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use App\Services\ProductEvents\ProductEventName;
use Illuminate\Support\Facades\DB;

// Phễu kích hoạt của các account đăng ký trong khoảng. Mỗi bước chỉ đếm account
// đã qua mọi bước trước để phễu luôn thu hẹp. Xác nhận email và kết nối kênh đọc
// từ sự kiện sản phẩm (product_events): kết nối là lúc kênh thật sự nối được (quét
// QR xong, IMAP lấy được thư, widget chạy trên website, token/OAuth được nhận),
// không phải chỉ vừa tạo hộp thư. Dữ liệu trước khi có bảng này đến từ lệnh
// product-events:backfill.
final class ActivationFunnelWidget extends MetricWidget
{
    private const STEPS = ['signed_up', 'confirmed_email', 'created_inbox', 'connected_channel', 'received_message', 'replied'];

    public function key(): string
    {
        return 'activation_funnel';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Medium;
    }

    public function compute(DateRange $range): array
    {
        $counts = $this->stepCounts($range);
        $signedUp = $counts['signed_up'];

        $steps = [];
        $previousCount = null;
        foreach (self::STEPS as $step) {
            $count = $counts[$step];
            $steps[] = [
                'key' => $step,
                'count' => $count,
                'rateFromStart' => $this->rate($count, $signedUp),
                'rateFromPrevious' => $previousCount === null ? null : $this->rate($count, $previousCount),
            ];
            $previousCount = $count;
        }

        return ['range' => $range->toArray(), 'steps' => $steps];
    }

    /** @return array<string, int> */
    private function stepCounts(DateRange $range): array
    {
        $eventExists = 'exists (select 1 from product_events where product_events.account_id = accounts.id and product_events.name = ?)';

        $cohort = DB::table('accounts')
            ->where('accounts.created_at', '>=', $range->startsAtUtc())
            ->where('accounts.created_at', '<', $range->endsBeforeUtc())
            ->selectRaw("{$eventExists} as confirmed_email", [ProductEventName::EmailConfirmed->value])
            ->selectRaw('exists (select 1 from inboxes where inboxes.account_id = accounts.id) as created_inbox')
            ->selectRaw("{$eventExists} as connected_channel", [ProductEventName::ChannelConnected->value])
            ->selectRaw(
                'exists (select 1 from messages where messages.account_id = accounts.id and messages.message_type = ?) as received_message',
                [Message::TYPE_INCOMING],
            )
            ->selectRaw(
                'exists (select 1 from messages where messages.account_id = accounts.id and messages.message_type = ?'
                .' and messages.private = false and messages.sender_type = ?) as replied',
                [Message::TYPE_OUTGOING, (new User)->getMorphClass()],
            );

        $passed = [];
        $selects = ['count(*) as signed_up'];
        foreach (array_slice(self::STEPS, 1) as $step) {
            $passed[] = $step;
            $selects[] = 'count(*) filter (where '.implode(' and ', $passed).") as {$step}";
        }

        $row = DB::query()->fromSub($cohort, 'cohort')->selectRaw(implode(', ', $selects))->first();

        return array_map('intval', (array) $row);
    }

    private function rate(int $count, int $base): ?float
    {
        return $base === 0 ? null : round($count / $base * 100, 1);
    }
}
