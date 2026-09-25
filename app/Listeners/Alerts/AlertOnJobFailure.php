<?php

namespace App\Listeners\Alerts;

use App\Support\Alerts\OpsAlerter;
use Illuminate\Queue\Events\JobFailed;

/**
 * Sự cố thật đã xảy ra: 128 lượt ActionCableBroadcastJob lỗi trôi qua 2 ngày
 * không ai biết vì Horizon chỉ hiển thị, không cảnh báo (docs/deployment.md
 * mục 8). Gộp theo lớp job + nội dung exception (OpsAlerter::send dedup theo
 * $signature) để một lỗi lặp lại hàng loạt không làm ngập Telegram.
 *
 * Không đưa nội dung exception hay payload job vào tin nhắn: job có thể mang
 * số điện thoại, nội dung tin nhắn khách trong đó. Tin cảnh báo chỉ có tên
 * lớp job, tên lớp exception, id job, tên hàng đợi — đủ để tra tiếp ở /horizon
 * hoặc /log-viewer. Chữ ký gộp (để dedup) vẫn băm cả nội dung exception, vì
 * giá trị đó không rời khỏi tiến trình.
 */
class AlertOnJobFailure
{
    public function __construct(private readonly OpsAlerter $alerter) {}

    public function handle(JobFailed $event): void
    {
        $jobClass = $event->job->resolveName();
        $exceptionClass = get_class($event->exception);
        $exceptionMessage = $event->exception->getMessage();

        $signature = 'job-failed:'.md5($jobClass.'|'.$exceptionMessage);

        $this->alerter->send($signature, sprintf(
            'Job lỗi: %s (%s) — queue: %s, job id: %s. Xem chi tiết ở /horizon hoặc /log-viewer.',
            $jobClass,
            $exceptionClass,
            $event->job->getQueue(),
            $event->job->getJobId(),
        ));
    }
}
