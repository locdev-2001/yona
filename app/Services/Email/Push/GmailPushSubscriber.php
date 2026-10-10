<?php

namespace App\Services\Email\Push;

use App\Models\Channel\Email;
use App\Services\Email\OAuth\EmailOAuthTokenManager;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/** Gmail `users.watch`: Gmail đẩy báo thư mới của INBOX vào topic Pub/Sub, hạn 7 ngày. */
class GmailPushSubscriber implements MailboxPushSubscriber
{
    private const WATCH_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/watch';

    private const TIMEOUT_SECONDS = 15;

    public function __construct(private readonly EmailOAuthTokenManager $tokens) {}

    public function supports(Email $channel): bool
    {
        return $channel->isGoogle() && filled(config('services.google_mail.pubsub_topic'));
    }

    public function subscribe(Email $channel): MailboxPushSubscription
    {
        try {
            $response = Http::withToken($this->tokens->accessToken($channel))
                ->timeout(self::TIMEOUT_SECONDS)
                ->post(self::WATCH_URL, [
                    'topicName' => config('services.google_mail.pubsub_topic'),
                    'labelIds' => ['INBOX'],
                    'labelFilterBehavior' => 'include',
                ]);
        } catch (ConnectionException $exception) {
            throw new MailboxPushException('Gmail watch: '.$exception->getMessage(), previous: $exception);
        }

        $expirationMs = $response->json('expiration');

        if ($response->failed() || ! is_numeric($expirationMs)) {
            throw new MailboxPushException("Gmail watch HTTP {$response->status()}: ".mb_substr($response->body(), 0, 300));
        }

        return new MailboxPushSubscription(
            CarbonImmutable::createFromTimestampMs((int) $expirationMs),
            filled($response->json('historyId')) ? (string) $response->json('historyId') : null,
        );
    }
}
