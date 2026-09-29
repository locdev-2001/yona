<?php

namespace App\Listeners\Alerts;

use App\Support\Alerts\OpsAlerter;
use Illuminate\Queue\Events\JobFailed;

/**
 * Không đưa nội dung exception hay payload job vào tin nhắn: job có thể mang
 * số điện thoại, nội dung tin nhắn khách trong đó. Tin cảnh báo chỉ có tên
 * lớp job, tên lớp exception, id job, tên hàng đợi — đủ để tra tiếp ở /horizon
 * hoặc /log-viewer.
 */
class AlertOnJobFailure
{
    public function __construct(private readonly OpsAlerter $alerter) {}

    public function handle(JobFailed $event): void
    {
        $jobClass = $event->job->resolveName();
        $exceptionClass = get_class($event->exception);

        // Gộp theo lớp job + lớp exception (không phải nội dung message, vốn mang id/timestamp
        // khiến mỗi lỗi có chữ ký riêng) — một cơn bão cùng loại lỗi chỉ ra đúng một tin.
        $signature = "job-failed:{$jobClass}:{$exceptionClass}";

        $this->alerter->send($signature, sprintf(
            'Job lỗi: %s (%s) — queue: %s, job id: %s. Xem chi tiết ở /horizon hoặc /logs.',
            $jobClass,
            $exceptionClass,
            $event->job->getQueue(),
            $event->job->getJobId(),
        ));
    }
}
