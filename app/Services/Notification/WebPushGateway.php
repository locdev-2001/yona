<?php

namespace App\Services\Notification;

use App\Models\NotificationSubscription;
use App\Support\SafeHttp;
use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Psr7\HttpFactory;
use Minishlink\WebPush\ContentEncoding;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Psr\Http\Client\ClientInterface;
use Psr\Log\LoggerInterface;
use Throwable;

// Adapter giao thức Web Push (RFC 8030 + VAPID RFC 8292) cho thông báo đẩy trình
// duyệt — phần WebPush.payload_send + handle_browser_push_error của
// Notification::PushNotificationService bản gốc. HTTP client tiêm được để test
// chạy đủ đường mã hoá + ký VAPID mà không ra mạng.
class WebPushGateway
{
    // ExpiredSubscription (404/410) và Unauthorized (401/403: đăng ký gắn với cặp
    // khoá VAPID khác) của gem web-push: đăng ký không bao giờ dùng lại được.
    private const SUBSCRIPTION_GONE_STATUSES = [401, 403, 404, 410];

    public function __construct(
        private readonly VapidService $vapid,
        private readonly LoggerInterface $logger,
        private readonly ?ClientInterface $httpClient = null,
    ) {}

    public function isAvailable(): bool
    {
        return $this->vapid->publicKey() !== null;
    }

    /** @param array<string, string> $payload */
    public function send(NotificationSubscription $subscription, array $payload, string $subject): PushDeliveryResult
    {
        $endpoint = (string) $subscription->subscriptionAttribute('endpoint');

        try {
            // Endpoint do trình duyệt khai, máy chủ tự gọi ra → qua cổng chống SSRF chung.
            SafeHttp::assertPublicUrl($endpoint);

            $report = $this->client($subject)->sendOneNotification(
                new Subscription(
                    $endpoint,
                    $subscription->subscriptionAttribute('p256dh'),
                    $subscription->subscriptionAttribute('auth'),
                    ContentEncoding::aes128gcm,
                ),
                json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
            );
        } catch (Throwable $exception) {
            $this->logger->error('Web push failed', [
                'subscription_id' => $subscription->id,
                'error' => $exception->getMessage(),
            ]);

            return PushDeliveryResult::Failed;
        }

        return $this->classify($subscription, $report);
    }

    private function classify(NotificationSubscription $subscription, MessageSentReport $report): PushDeliveryResult
    {
        if ($report->isSuccess()) {
            return PushDeliveryResult::Delivered;
        }

        $status = $report->getResponse()?->getStatusCode();
        $context = ['subscription_id' => $subscription->id, 'status' => $status, 'reason' => $report->getReason()];

        if (in_array($status, self::SUBSCRIPTION_GONE_STATUSES, true)) {
            $this->logger->info('Web push subscription expired', $context);

            return PushDeliveryResult::SubscriptionGone;
        }

        $this->logger->warning('Web push rejected', $context);

        return PushDeliveryResult::Failed;
    }

    private function client(string $subject): WebPush
    {
        $httpFactory = new HttpFactory;

        return new WebPush(
            auth: [
                'VAPID' => [
                    'subject' => $subject,
                    'publicKey' => $this->vapid->publicKey(),
                    'privateKey' => $this->vapid->privateKey(),
                ],
            ],
            client: $this->httpClient ?? new GuzzleClient([
                'timeout' => config('webpush.timeout'),
                'connect_timeout' => config('webpush.timeout'),
            ]),
            requestFactory: $httpFactory,
            streamFactory: $httpFactory,
            logger: $this->logger,
        );
    }
}
