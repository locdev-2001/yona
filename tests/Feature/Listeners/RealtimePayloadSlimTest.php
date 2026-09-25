<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\NotificationResource;
use App\Jobs\ActionCableBroadcastJob;
use App\Listeners\ActionCableListener;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Kiểm payload thực sự đi trên dây tới Reverb — Pusher SDK (laravel/reverb tương
// thích Pusher protocol) đóng gói POST body dạng {"name","channels","data"} với
// "data" LÀ MỘT CHUỖI JSON (double-encode). config/reverb.php: max_request_size =
// 10_000 B (KHÔNG đổi ở đây — thuộc "mức 1" của Robert).
const REVERB_MAX_REQUEST_SIZE = 10_000;

function pusherWireSize(string $eventName, string $channel, array $data): int
{
    return strlen(json_encode([
        'name' => $eventName,
        'channels' => [$channel],
        'data' => json_encode($data, JSON_THROW_ON_ERROR),
    ], JSON_THROW_ON_ERROR));
}

// 4000 ký tự tiếng Việt (có dấu, 2-3 byte/ký tự UTF-8) — sát tình huống nặng nhất
// thực tế hơn ASCII thuần.
function heavyVietnameseContent(): string
{
    $phrase = 'Xin chào quý khách, đây là nội dung tin nhắn rất dài để kiểm tra giới hạn kích thước gói tin realtime của hệ thống Yona. ';

    return mb_substr(str_repeat($phrase, 50), 0, 4000);
}

/**
 * Hội thoại nặng nhất đo được trong báo cáo: tin 4000 ký tự + album 20 ảnh + 12 nhãn.
 *
 * @return array{0: Account, 1: User, 2: User, 3: Inbox, 4: Conversation, 5: Message}
 */
function buildHeavyConversation(): array
{
    $account = Account::factory()->create();
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $inbox->addMembers([$agent->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'assignee_id' => $agent->id,
    ]);

    $labels = Label::factory()->count(12)->create(['account_id' => $account->id]);
    $conversation->updateLabels($labels->pluck('title')->all());

    $message = Message::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'conversation_id' => $conversation->id,
        'content' => heavyVietnameseContent(),
    ]);

    Storage::fake('public');
    foreach (range(1, 20) as $i) {
        $message->attachments()->create(Attachment::storeUpload(
            UploadedFile::fake()->image("photo-{$i}.jpg", 800, 600),
            $account->id,
        ));
    }

    return [$account, $admin, $agent, $inbox, $conversation->fresh(), $message->fresh(['attachments'])];
}

function onlyPushedBroadcastJob(): ActionCableBroadcastJob
{
    $jobs = Queue::pushedJobs()[ActionCableBroadcastJob::class] ?? [];
    expect($jobs)->toHaveCount(1);

    return $jobs[0]['job'];
}

describe('conversation.typing_on/off', function () {
    it('carries only conversation id, user and is_private — well under the Reverb limit', function () {
        [$account, , $agent, , $conversation] = buildHeavyConversation();
        Queue::fake();

        app(ActionCableListener::class)->handle(new DomainEvent(EventType::CONVERSATION_TYPING_ON, [
            'conversation' => $conversation, 'user' => $agent, 'is_private' => false,
        ]));

        $job = onlyPushedBroadcastJob();
        expect($job->data['conversation'])->toBe(['id' => $conversation->display_id])
            ->and($job->data)->toHaveKeys(['conversation', 'user', 'is_private', 'account_id']);

        $size = pusherWireSize($job->eventName, 'private-'.$agent->pubsub_token, $job->data);
        expect($size)->toBeLessThan(REVERB_MAX_REQUEST_SIZE);
    });

    it('typing_off is equally slim', function () {
        [$account, , $agent, , $conversation] = buildHeavyConversation();
        Queue::fake();

        app(ActionCableListener::class)->handle(new DomainEvent(EventType::CONVERSATION_TYPING_OFF, [
            'conversation' => $conversation, 'user' => $agent, 'is_private' => false,
        ]));

        $job = onlyPushedBroadcastJob();
        expect($job->data['conversation'])->toBe(['id' => $conversation->display_id]);

        $size = pusherWireSize($job->eventName, 'private-'.$agent->pubsub_token, $job->data);
        expect($size)->toBeLessThan(REVERB_MAX_REQUEST_SIZE);
    });
});

function buildHeavyMentionNotification(Account $account, User $agent, Conversation $conversation, Message $message): Notification
{
    return Notification::factory()->create([
        'account_id' => $account->id,
        'user_id' => $agent->id,
        'notification_type' => Notification::typeValue('conversation_mention'),
        'primary_actor_type' => 'Conversation',
        'primary_actor_id' => $conversation->id,
        'secondary_actor_type' => 'Message',
        'secondary_actor_id' => $message->id,
    ]);
}

describe('notification.created/updated', function () {
    it('compacts primary_actor to id/display_id/inbox_id/status/priority/meta.sender', function () {
        [$account, , $agent, , $conversation, $message] = buildHeavyConversation();
        $notification = buildHeavyMentionNotification($account, $agent, $conversation, $message);
        Queue::fake();

        app(ActionCableListener::class)->handle(new DomainEvent(EventType::NOTIFICATION_CREATED, ['notification' => $notification->fresh()]));

        $job = onlyPushedBroadcastJob();
        $primaryActor = $job->data['notification']['primary_actor'];

        expect($primaryActor)->toBe([
            'id' => $conversation->display_id,
            'display_id' => $conversation->display_id,
            'inbox_id' => $conversation->inbox_id,
            'status' => $conversation->statusName(),
            'priority' => $conversation->priorityName(),
            'meta' => [
                'sender' => [
                    'name' => $conversation->contact->name,
                    'thumbnail' => $conversation->contact->avatarUrl(),
                ],
            ],
        ]);
    });

    it('compacts secondary_actor to id/sender/truncated content/attachment count+types, no file URLs', function () {
        [$account, , $agent, , $conversation, $message] = buildHeavyConversation();
        $notification = buildHeavyMentionNotification($account, $agent, $conversation, $message);
        Queue::fake();

        app(ActionCableListener::class)->handle(new DomainEvent(EventType::NOTIFICATION_CREATED, ['notification' => $notification->fresh()]));

        $secondaryActor = onlyPushedBroadcastJob()->data['notification']['secondary_actor'];

        expect($secondaryActor['id'])->toBe($message->id)
            ->and(mb_strlen($secondaryActor['content']))->toBeLessThanOrEqual(210)
            ->and($secondaryActor['attachment_count'])->toBe(20)
            ->and($secondaryActor['attachment_types'])->toBe(['image'])
            ->and($secondaryActor)->not->toHaveKey('data_url')
            ->and($secondaryActor)->not->toHaveKey('attachments');
    });

    it('notification.created and notification.updated stay well under the Reverb limit for the heaviest conversation', function () {
        [$account, , $agent, , $conversation, $message] = buildHeavyConversation();
        $notification = buildHeavyMentionNotification($account, $agent, $conversation, $message);
        Queue::fake();

        app(ActionCableListener::class)->handle(new DomainEvent(EventType::NOTIFICATION_CREATED, ['notification' => $notification->fresh()]));
        $createdJob = onlyPushedBroadcastJob();
        $createdSize = pusherWireSize($createdJob->eventName, 'private-'.$agent->pubsub_token, $createdJob->data);
        expect($createdSize)->toBeLessThan(REVERB_MAX_REQUEST_SIZE);

        Queue::fake();
        // Notification::booted() tự bắn NOTIFICATION_UPDATED trong hook `updated` —
        // không cần gọi listener thủ công lần nữa (khác nhánh created ở trên, nơi
        // bản ghi được tạo TRƯỚC khi Queue::fake() bật).
        $notification->update(['read_at' => now()]);
        $updatedJob = onlyPushedBroadcastJob();
        $updatedSize = pusherWireSize($updatedJob->eventName, 'private-'.$agent->pubsub_token, $updatedJob->data);
        expect($updatedSize)->toBeLessThan(REVERB_MAX_REQUEST_SIZE);
    });

    // REST GET /notifications KHÔNG được đổi — vẫn phải trả đủ ConversationResource/
    // MessageResource::pushEventData (NotificationResource không gọi Notification::pushEventData()).
    it('keeps the REST notification payload unchanged with the full conversation and message', function () {
        [$account, , $agent, , $conversation, $message] = buildHeavyConversation();
        $notification = buildHeavyMentionNotification($account, $agent, $conversation, $message);

        $rest = (new NotificationResource($notification->fresh()))->toArray(request());

        expect($rest['primary_actor'])->toHaveKey('labels')
            ->and($rest['secondary_actor']['content'])->toBe($message->content)
            ->and($rest['secondary_actor']['attachments'])->toHaveCount(20);
    });
});

describe('conversation push payload (assignee.changed etc.)', function () {
    it('shares one compact preview instead of sending the last message twice', function () {
        [, , , , $conversation, $message] = buildHeavyConversation();

        $data = ConversationResource::pushEventData($conversation->fresh());

        expect($data['messages'])->toHaveCount(1)
            ->and($data['messages'][0])->toBe($data['last_non_activity_message'])
            ->and($data['messages'][0]['id'])->toBe($message->id)
            ->and($data['messages'][0])->not->toHaveKey('sentiment')
            ->and($data['messages'][0])->not->toHaveKey('conversation')
            ->and($data['messages'][0]['attachments'])->toHaveCount(1)
            ->and(mb_strlen($data['messages'][0]['content']))->toBeLessThanOrEqual(210);
    });

    it('keeps two distinct compact previews when the last message is an activity event', function () {
        [$account, , , , $conversation, $message] = buildHeavyConversation();
        $activity = Message::factory()->activity()->create([
            'account_id' => $account->id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'content' => 'Cuộc trò chuyện đã được gán lại',
        ]);

        $data = ConversationResource::pushEventData($conversation->fresh());

        expect($data['messages'][0]['id'])->toBe($activity->id)
            ->and($data['last_non_activity_message']['id'])->toBe($message->id)
            ->and($data['messages'][0])->not->toBe($data['last_non_activity_message']);
    });

    it('keeps the REST conversation payload unchanged with the full last message', function () {
        [, , , , $conversation, $message] = buildHeavyConversation();

        $rest = (new ConversationResource($conversation->fresh(['latestMessage.attachments', 'latestNonActivityMessage.attachments'])))
            ->toArray(request());

        expect($rest['messages'][0]['id'])->toBe($message->id)
            ->and($rest['messages'][0])->toHaveKey('sentiment')
            ->and($rest['messages'][0])->toHaveKey('conversation')
            ->and($rest['messages'][0]['content'])->toBe($message->content)
            ->and($rest['messages'][0]['attachments'])->toHaveCount(20);
    });

    it('assignee.changed stays well under the Reverb limit for the heaviest conversation', function () {
        [$account, $admin, $agent, , $conversation] = buildHeavyConversation();
        Queue::fake();

        app(ActionCableListener::class)->handle(new DomainEvent(EventType::ASSIGNEE_CHANGED, ['conversation' => $conversation]));

        $job = onlyPushedBroadcastJob();
        $size = pusherWireSize($job->eventName, 'private-'.$agent->pubsub_token, $job->data);
        expect($size)->toBeLessThan(REVERB_MAX_REQUEST_SIZE);
    });
});
