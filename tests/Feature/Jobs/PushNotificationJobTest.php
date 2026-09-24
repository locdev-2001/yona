<?php

use App\Jobs\Notification\EmailNotificationJob;
use App\Jobs\Notification\PushNotificationJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\InstallationConfig;
use App\Models\Message;
use App\Models\Notification;
use App\Models\NotificationSetting;
use App\Models\NotificationSubscription;
use App\Models\User;
use App\Services\Notification\PushNotificationService;
use App\Services\Notification\VapidService;
use App\Services\Notification\WebPushGateway;
use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Queue;
use Psr\Http\Message\RequestInterface;
use Psr\Log\LoggerInterface;
use Tests\Support\BrowserPushSubscription;

// Port từ spec/services/notification/push_notification_service_spec.rb +
// spec/models/notification_spec.rb (process_notification_delivery). Push service
// được thay bằng HTTP client giả; mã hoá + ký VAPID vẫn chạy thật.

beforeEach(function () {
    config([
        'webpush.vapid.public_key' => null,
        'webpush.vapid.private_key' => null,
        // Endpoint giả (fcm.googleapis.com) không phân giải DNS trong môi trường test.
        'safe_http.allow_private_networks' => true,
    ]);

    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->user->id]);
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
    $this->browser = BrowserPushSubscription::make();
    $this->sentPushes = [];
});

function selectPushFlags(Account $account, User $user, array $notificationTypes): void
{
    $setting = NotificationSetting::query()->where('account_id', $account->id)->where('user_id', $user->id)->sole();
    $setting->setSelectedFlags('push', array_map(fn (string $type) => "push_{$type}", $notificationTypes));
    $setting->setSelectedFlags('email', []);
    $setting->save();
}

// Push service giả trả lần lượt các mã HTTP cho trước; mọi request đi ra được ghi lại.
function fakePushService(array &$sentPushes, int ...$statuses): void
{
    $stack = HandlerStack::create(new MockHandler(array_map(fn (int $status) => new Response($status), $statuses)));
    $stack->push(Middleware::history($sentPushes));

    app()->instance(WebPushGateway::class, new WebPushGateway(
        app(VapidService::class),
        app(LoggerInterface::class),
        new GuzzleClient(['handler' => $stack]),
    ));
}

function assignmentNotification(Account $account, User $user, Conversation $conversation): Notification
{
    return Notification::factory()->ofType('conversation_assignment')->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'primary_actor_id' => $conversation->id,
    ]);
}

function sentPushRequest(array $sentPushes, int $index = 0): RequestInterface
{
    return $sentPushes[$index]['request'];
}

describe('dispatch from a new notification', function () {
    it('queues the push job when the user turned push on for that notification type', function () {
        Queue::fake();
        selectPushFlags($this->account, $this->user, ['conversation_assignment']);

        $notification = assignmentNotification($this->account, $this->user, $this->conversation);

        Queue::assertPushed(PushNotificationJob::class, fn (PushNotificationJob $job) => $job->queue === 'default');
        Queue::assertNotPushed(EmailNotificationJob::class);
        expect($notification->exists)->toBeTrue();
    });

    it('does not queue the push job when push is off for that notification type', function () {
        Queue::fake();
        selectPushFlags($this->account, $this->user, ['conversation_mention']);

        assignmentNotification($this->account, $this->user, $this->conversation);

        Queue::assertNotPushed(PushNotificationJob::class);
    });
});

describe('sending', function () {
    beforeEach(function () {
        selectPushFlags($this->account, $this->user, ['conversation_assignment']);
        NotificationSubscription::registerBrowserPush($this->user, $this->browser->attributes());
    });

    it('delivers an encrypted, VAPID-signed push the browser can read', function () {
        fakePushService($this->sentPushes, 201);
        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->conversation->inbox_id,
            'conversation_id' => $this->conversation->id,
            'message_type' => Message::MESSAGE_TYPES['incoming'],
            'content' => 'Shop còn size M không ạ?',
        ]);

        $notification = assignmentNotification($this->account, $this->user, $this->conversation);

        expect($this->sentPushes)->toHaveCount(1);

        $request = sentPushRequest($this->sentPushes);
        $conversationUrl = url("/app/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}");

        expect((string) $request->getUri())->toBe($this->browser->endpoint)
            ->and($request->getHeaderLine('Content-Encoding'))->toBe('aes128gcm')
            ->and($request->getHeaderLine('Authorization'))
            ->toStartWith('vapid t=')
            ->toContain('k='.app(VapidService::class)->publicKey())
            ->and($this->browser->decrypt((string) $request->getBody()))->toBe([
                'title' => "A conversation (#{$this->conversation->display_id}) has been assigned to you",
                'body' => $notification->pushMessageBody(),
                'tag' => "conversation_{$this->account->id}_{$this->conversation->display_id}",
                'url' => $conversationUrl,
                'icon' => url(config('yona.branding.logo_thumbnail')),
                'badge_count' => 1,
                'data' => [
                    'account_id' => $this->account->id,
                    'notification_id' => $notification->id,
                    'primary_actor_type' => 'Conversation',
                    'primary_actor_id' => $this->conversation->id,
                ],
            ])
            ->and($notification->pushMessageBody())->toContain('Shop còn size M không ạ?');
    });

    it('still delivers when the customer message is too long for one Web Push payload', function () {
        fakePushService($this->sentPushes, 201);
        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->conversation->inbox_id,
            'conversation_id' => $this->conversation->id,
            'message_type' => Message::MESSAGE_TYPES['incoming'],
            'content' => 'https://shop.example/san-pham?ref='.str_repeat('dàisảnphẩm', 600),
        ]);

        assignmentNotification($this->account, $this->user, $this->conversation);

        expect($this->sentPushes)->toHaveCount(1);

        $delivered = $this->browser->decrypt((string) sentPushRequest($this->sentPushes)->getBody());

        expect($delivered['body'])->toContain('https://shop.example/san-pham?ref=dàisảnphẩm')
            ->and(mb_strlen($delivered['body']))->toBeLessThanOrEqual(PushNotificationService::BODY_MAX_CHARACTERS + 3)
            ->and(NotificationSubscription::query()->count())->toBe(1);
    });

    it('pushes to every browser of the user and to nobody else', function () {
        $secondBrowser = BrowserPushSubscription::make('https://updates.push.services.mozilla.com/wpush/v2/second');
        NotificationSubscription::registerBrowserPush($this->user, $secondBrowser->attributes());
        NotificationSubscription::registerBrowserPush(
            User::factory()->create(),
            BrowserPushSubscription::make('https://web.push.apple.com/someone-else')->attributes(),
        );
        fakePushService($this->sentPushes, 201, 201);

        assignmentNotification($this->account, $this->user, $this->conversation);

        $endpoints = array_map(fn (array $push) => (string) $push['request']->getUri(), $this->sentPushes);

        expect($endpoints)->toEqualCanonicalizing([$this->browser->endpoint, $secondBrowser->endpoint]);
    });

    it('removes a subscription the push service says is gone', function (int $status) {
        fakePushService($this->sentPushes, $status);

        assignmentNotification($this->account, $this->user, $this->conversation);

        expect($this->sentPushes)->toHaveCount(1)
            ->and(NotificationSubscription::query()->count())->toBe(0);
    })->with([404, 410, 401, 403]);

    it('keeps the subscription through temporary push service failures', function (int $status) {
        fakePushService($this->sentPushes, $status);

        assignmentNotification($this->account, $this->user, $this->conversation);

        expect($this->sentPushes)->toHaveCount(1)
            ->and(NotificationSubscription::query()->count())->toBe(1);
    })->with([429, 500, 503]);

    it('never calls an endpoint that points into the private network', function () {
        config(['safe_http.allow_private_networks' => false]);
        NotificationSubscription::query()->delete();
        NotificationSubscription::registerBrowserPush(
            $this->user,
            BrowserPushSubscription::make('https://127.0.0.1/internal')->attributes(),
        );
        fakePushService($this->sentPushes, 201);

        assignmentNotification($this->account, $this->user, $this->conversation);

        expect($this->sentPushes)->toBe([]);
    });

    it('sends nothing when the server has no VAPID keys', function () {
        app()->instance(VapidService::class, new class extends VapidService
        {
            public function publicKey(): ?string
            {
                return null;
            }
        });
        fakePushService($this->sentPushes, 201);

        assignmentNotification($this->account, $this->user, $this->conversation);

        expect($this->sentPushes)->toBe([]);
    });

    it('does not push a notification that was read before the job ran', function () {
        Queue::fake();
        $notification = assignmentNotification($this->account, $this->user, $this->conversation);
        $notification->update(['read_at' => now()]);
        fakePushService($this->sentPushes, 201);

        app()->call([new PushNotificationJob($notification->id), 'handle']);

        expect($this->sentPushes)->toBe([]);
    });

    it('badge_count counts only unread, non-snoozed notifications of the same account', function () {
        $otherAccount = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $otherAccount->id, 'user_id' => $this->user->id]);
        $quietNotification = fn (array $attributes) => Notification::factory()->ofType('conversation_assignment')->createQuietly([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => Conversation::factory()->create(['account_id' => $this->account->id])->id,
            ...$attributes,
        ]);
        $quietNotification([]);
        $quietNotification(['read_at' => now()]);
        $quietNotification(['snoozed_until' => now()->addDay()]);
        $quietNotification([
            'account_id' => $otherAccount->id,
            'primary_actor_id' => Conversation::factory()->create(['account_id' => $otherAccount->id])->id,
        ]);
        fakePushService($this->sentPushes, 201);

        assignmentNotification($this->account, $this->user, $this->conversation);

        expect($this->sentPushes)->toHaveCount(1)
            ->and($this->browser->decrypt((string) sentPushRequest($this->sentPushes)->getBody())['badge_count'])->toBe(2);
    });

    it('two notifications of one conversation share the same tag', function () {
        selectPushFlags($this->account, $this->user, ['conversation_assignment', 'assigned_conversation_new_message']);
        fakePushService($this->sentPushes, 201, 201);

        $assignment = assignmentNotification($this->account, $this->user, $this->conversation);
        $newMessage = Notification::factory()->ofType('assigned_conversation_new_message')->create([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
        ]);

        expect($this->sentPushes)->toHaveCount(2);

        [$first, $second] = array_map(
            fn (int $index) => $this->browser->decrypt((string) sentPushRequest($this->sentPushes, $index)->getBody()),
            [0, 1],
        );

        expect($first['tag'])->toBe("conversation_{$this->account->id}_{$this->conversation->display_id}")
            ->and($second['tag'])->toBe($first['tag'])
            ->and([$first['data']['notification_id'], $second['data']['notification_id']])->toBe([$assignment->id, $newMessage->id]);
    });

    it('does nothing once the notification is gone', function () {
        fakePushService($this->sentPushes, 201);

        app()->call([new PushNotificationJob(999_999), 'handle']);

        expect($this->sentPushes)->toBe([]);
    });

    it('only generates VAPID keys when the user has a browser to push to', function () {
        NotificationSubscription::query()->delete();
        fakePushService($this->sentPushes);

        assignmentNotification($this->account, $this->user, $this->conversation);

        expect($this->sentPushes)->toBe([])
            ->and(InstallationConfig::query()->where('name', VapidService::CONFIG_NAME)->exists())->toBeFalse();
    });
});
