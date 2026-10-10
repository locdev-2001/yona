<?php

namespace App\Services\Email\Push;

use App\Models\Channel\Email;
use App\Services\Email\MailServerException;
use App\Services\Email\OAuth\EmailOAuthTokenManager;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/** Gmail `users.watch`/`users.stop`: Gmail đẩy báo thư mới của INBOX vào topic Pub/Sub, hạn 7 ngày. */
class GmailPushSubscriber implements MailboxPushSubscriber
{
    private const WATCH_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/watch';

    private const STOP_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/stop';

    private const TIMEOUT_SECONDS = 15;

    public function __construct(private readonly EmailOAuthTokenManager $tokens) {}

    public function supports(Email $channel): bool
    {
        return $channel->isGoogle() && filled(config('services.google_mail.pubsub_topic'));
    }

    public function subscribe(Email $channel): MailboxPushSubscription
    {
        $response = $this->post($channel, self::WATCH_URL, [
            'topicName' => config('services.google_mail.pubsub_topic'),
            'labelIds' => ['INBOX'],
            'labelFilterBehavior' => 'include',
        ]);

        $expirationMs = $response->json('expiration');

        if (! is_numeric($expirationMs)) {
            throw new MailboxPushException('Gmail watch không trả hạn đăng ký: '.mb_substr($response->body(), 0, 300));
        }

        return new MailboxPushSubscription(
            CarbonImmutable::createFromTimestampMs((int) $expirationMs),
            filled($response->json('historyId')) ? (string) $response->json('historyId') : null,
        );
    }

    public function stop(Email $channel): void
    {
        $this->post($channel, self::STOP_URL);
    }

    /**
     * @param  array<string, mixed>  $payload
     *
     * @throws MailboxPushException
     */
    private function post(Email $channel, string $url, array $payload = []): Response
    {
        try {
            $response = Http::withToken($this->tokens->accessToken($channel, recordFailure: false))
                ->timeout(self::TIMEOUT_SECONDS)
                ->post($url, $payload);
        } catch (ConnectionException|MailServerException $exception) {
            throw new MailboxPushException('Gmail '.basename($url).': '.$exception->getMessage(), previous: $exception);
        }

        if ($response->failed()) {
            throw new MailboxPushException('Gmail '.basename($url)." HTTP {$response->status()}: ".mb_substr($response->body(), 0, 300));
        }

        return $response;
    }
}
