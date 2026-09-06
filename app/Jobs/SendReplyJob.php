<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\Email\SendOnEmailService;
use App\Services\Messages\SendEmailNotificationService;

/**
 * Port từ refs/chatwoot/app/jobs/send_reply_job.rb — mọi tin vừa tạo đi qua đây,
 * bảng CHANNEL_SERVICES quyết định driver nào thực sự gửi ra ngoài.
 * Thêm kênh mới = thêm MỘT dòng, không sửa Message.
 */
class SendReplyJob extends ApplicationJob
{
    /** @var array<string, class-string> */
    private const CHANNEL_SERVICES = [
        'Channel::Email' => SendOnEmailService::class,
        'Channel::WebWidget' => SendEmailNotificationService::class,
        'Channel::Api' => SendEmailNotificationService::class,
    ];

    public function __construct(public readonly Message $message) {}

    public function handle(): void
    {
        $serviceClass = self::CHANNEL_SERVICES[$this->message->conversation->inbox->channel_type] ?? null;

        if ($serviceClass === null) {
            return;
        }

        (new $serviceClass($this->message))->perform();
    }
}
