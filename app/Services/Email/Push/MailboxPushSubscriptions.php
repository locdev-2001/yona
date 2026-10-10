<?php

namespace App\Services\Email\Push;

use App\Models\Channel\Email;
use App\Services\Email\MailServerException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;

/**
 * Sổ đăng ký báo thư mới theo nhà cung cấp — thêm nhà cung cấp = thêm một dòng. Đăng ký
 * hỏng không bao giờ chặn kết nối hộp thư: lượt quét IMAP định kỳ vẫn là lưới an toàn.
 * Hạn đăng ký lưu ở `provider_config.push` của kênh.
 */
class MailboxPushSubscriptions
{
    /** @var list<class-string<MailboxPushSubscriber>> */
    private const SUBSCRIBERS = [
        GmailPushSubscriber::class,
    ];

    private const RENEW_BEFORE_DAYS = 2;

    public function subscribe(Email $channel): bool
    {
        $subscriber = $this->subscriberFor($channel);

        if ($subscriber === null || $channel->reauthorizationRequired()) {
            return false;
        }

        try {
            $subscription = $subscriber->subscribe($channel);
        } catch (MailboxPushException|MailServerException $exception) {
            Log::warning("[EMAIL PUSH] Không đăng ký được báo thư mới cho kênh {$channel->id}: {$exception->getMessage()}");

            return false;
        }

        $channel->forceFill(['provider_config' => [
            ...$channel->provider_config ?? [],
            'push' => [
                'expires_at' => $subscription->expiresAt->toIso8601String(),
                'cursor' => $subscription->cursor,
            ],
        ]])->save();

        return true;
    }

    /** Gia hạn khi chưa từng đăng ký hoặc hạn còn dưới RENEW_BEFORE_DAYS ngày. */
    public function renewIfDue(Email $channel): bool
    {
        $expiresAt = $channel->provider_config['push']['expires_at'] ?? null;

        if ($expiresAt !== null && CarbonImmutable::parse($expiresAt)->subDays(self::RENEW_BEFORE_DAYS)->isFuture()) {
            return false;
        }

        return $this->subscribe($channel);
    }

    private function subscriberFor(Email $channel): ?MailboxPushSubscriber
    {
        foreach (self::SUBSCRIBERS as $class) {
            $subscriber = app($class);

            if ($subscriber->supports($channel)) {
                return $subscriber;
            }
        }

        return null;
    }
}
