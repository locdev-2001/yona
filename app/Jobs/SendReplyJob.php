<?php

namespace App\Jobs;

use App\Messaging\Delivery\OutboundOrder;
use App\Messaging\Delivery\PendingDocument;
use App\Models\Message;
use App\Services\Email\SendOnEmailService;
use App\Services\Facebook\SendOnFacebookService;
use App\Services\Instagram\SendOnInstagramService;
use App\Services\Line\SendOnLineService;
use App\Services\Messages\SendEmailNotificationService;
use App\Services\MessengerPersonal\SendOnMessengerPersonalService;
use App\Services\Sms\SendOnSmsService;
use App\Services\Telegram\SendOnTelegramService;
use App\Services\Tiktok\SendOnTiktokService;
use App\Services\Twilio\SendOnTwilioService;
use App\Services\Whatsapp\SendOnWhatsappService;
use App\Services\Yona\SendOnYonaService;
use App\Services\Zalo\SendOnZaloService;
use Throwable;

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
        'Channel::Yona' => SendOnYonaService::class,
        'Channel::MessengerPersonal' => SendOnMessengerPersonalService::class,
    ];

    /** Tin chữ: người gửi đang nhìn bong bóng chờ tick, không xếp sau thông báo/phân công. */
    public const TEXT_QUEUE = 'high';

    /** Tin có tệp (kể cả tệp còn chờ dựng): tải và đẩy tệp tới 120s, chạy ở pool worker riêng (config/horizon.php). */
    public const MEDIA_QUEUE = 'media';

    public function __construct(public readonly Message $message)
    {
        $this->onQueue(self::queueFor($message));
    }

    /** Chỗ DUY NHẤT quyết định tin đi hàng đợi nào. */
    public static function queueFor(Message $message): string
    {
        return $message->attachments->isEmpty() && ! PendingDocument::isPending($message) ? self::TEXT_QUEUE : self::MEDIA_QUEUE;
    }

    // Lỗi ném ra thì chưa nhả hàng: lượt thử lại vẫn là tin đầu hàng của hội thoại.
    public function handle(): void
    {
        $serviceClass = self::CHANNEL_SERVICES[$this->message->conversation->inbox->channel_type] ?? null;

        if ($serviceClass !== null && app(PendingDocument::class)->materialize($this->message)) {
            (new $serviceClass($this->message))->perform();
        }

        app(OutboundOrder::class)->release($this->message);
    }

    /** Hỏng sau lượt cuối: tin sau trong hội thoại không được chờ mãi. */
    public function failed(?Throwable $exception): void
    {
        app(OutboundOrder::class)->release($this->message);
    }
}
