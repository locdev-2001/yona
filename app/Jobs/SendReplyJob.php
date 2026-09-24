<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\Email\SendOnEmailService;
use App\Services\Facebook\SendOnFacebookService;
use App\Services\Instagram\SendOnInstagramService;
use App\Services\Line\SendOnLineService;
use App\Services\Messages\SendEmailNotificationService;
use App\Services\Sms\SendOnSmsService;
use App\Services\Telegram\SendOnTelegramService;
use App\Services\Tiktok\SendOnTiktokService;
use App\Services\Twilio\SendOnTwilioService;
use App\Services\Whatsapp\SendOnWhatsappService;
use App\Services\Zalo\SendOnZaloService;

/**
 * Mọi tin vừa tạo đi qua đây,
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
        'Channel::FacebookPage' => SendOnFacebookService::class,
        'Channel::Instagram' => SendOnInstagramService::class,
        'Channel::Telegram' => SendOnTelegramService::class,
        'Channel::Line' => SendOnLineService::class,
        'Channel::Sms' => SendOnSmsService::class,
        'Channel::TwilioSms' => SendOnTwilioService::class,
        'Channel::Whatsapp' => SendOnWhatsappService::class,
        'Channel::Tiktok' => SendOnTiktokService::class,
        'Channel::Zalo' => SendOnZaloService::class,
    ];

    // Tier high: người gửi đang nhìn bong bóng chờ tick, không xếp sau
    // thông báo/phân công ở tier default.
    public function __construct(public readonly Message $message)
    {
        $this->onQueue('high');
    }

    public function handle(): void
    {
        $serviceClass = self::CHANNEL_SERVICES[$this->message->conversation->inbox->channel_type] ?? null;

        if ($serviceClass === null) {
            return;
        }

        (new $serviceClass($this->message))->perform();
    }
}
