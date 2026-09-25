<?php

use App\Events\DomainEvent;
use App\Events\EventType;
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
use Illuminate\Support\Facades\Queue;

// Reverb nhận mỗi sự kiện qua một lượt POST từ Laravel và đóng kết nối 413
// "Payload too large" khi cả lượt POST vượt `max_request_size`: sự kiện mất lặng lẽ.
// Hội thoại Zalo "nặng" (album 10 ảnh, tin dài 1500 ký tự, 12 nhãn) phải lọt ngưỡng.

// Dòng request + chữ ký auth_* trên query + header của lượt POST, làm tròn lên.
const REVERB_REQUEST_OVERHEAD_BYTES = 1024;

/** Kích thước lượt POST tới Reverb, dựng body đúng như SDK Pusher (data mã hoá JSON hai lần). */
function reverbRequestBytes(ActionCableBroadcastJob $job): int
{
    $body = json_encode([
        'name' => $job->eventName,
        'data' => json_encode($job->data, JSON_THROW_ON_ERROR),
        'channel' => 'private-'.$job->members[0],
    ], JSON_THROW_ON_ERROR);

    return strlen($body) + REVERB_REQUEST_OVERHEAD_BYTES;
}

function broadcastJobFor(EventType $type, array $data): ActionCableBroadcastJob
{
    Queue::fake();
    app(ActionCableListener::class)->handle(new DomainEvent($type, $data));

    return Queue::pushedJobs()[ActionCableBroadcastJob::class][0]['job'];
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $inbox = Inbox::factory()->zalo()->create(['account_id' => $this->account->id]);
    $inbox->addMembers([$this->agent->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $inbox->id,
        'additional_attributes' => ['thread_id' => '9876543210', 'thread_type' => 1],
    ]);

    $labels = array_map(fn (int $index) => "nhan-khach-hang-{$index}", range(1, 12));
    foreach ($labels as $title) {
        Label::factory()->create(['account_id' => $this->account->id, 'title' => $title]);
    }
    $this->conversation->updateLabels($labels);

    $sentence = 'Dạ shop ơi cho em hỏi mẫu áo này còn size M màu xanh rêu không ạ, em muốn đặt hai cái gửi về Hà Nội trong tuần này. ';
    $message = new Message([
        'account_id' => $this->account->id,
        'inbox_id' => $inbox->id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => mb_substr(str_repeat($sentence, 20), 0, 1500),
    ]);
    $message->sender()->associate($this->conversation->contact);
    $message->pendingAttachments = array_map(fn (int $index) => new Attachment([
        'account_id' => $this->account->id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => "attachments/{$this->account->id}/anh-{$index}.jpg",
        'filename' => "anh-san-pham-mau-moi-{$index}.jpg",
        'content_type' => 'image/jpeg',
        'byte_size' => 340111,
        'meta' => ['width' => 1280, 'height' => 1706],
    ]), range(1, 10));
    $message->save();
    $this->message = $message;
    $this->conversation->refresh();
});

it('hội thoại nặng: sự kiện thông báo, đang gõ, cập nhật hội thoại đều lọt max_request_size của Reverb', function () {
    $notification = Notification::factory()->ofType('conversation_mention')->create([
        'account_id' => $this->account->id,
        'user_id' => $this->agent->id,
        'primary_actor_id' => $this->conversation->id,
        'secondary_actor_type' => $this->message->getMorphClass(),
        'secondary_actor_id' => $this->message->id,
    ]);

    $jobs = [
        broadcastJobFor(EventType::NOTIFICATION_CREATED, ['notification' => $notification]),
        broadcastJobFor(EventType::NOTIFICATION_UPDATED, ['notification' => $notification]),
        broadcastJobFor(EventType::CONVERSATION_TYPING_ON, ['conversation' => $this->conversation, 'user' => $this->agent, 'is_private' => false]),
        broadcastJobFor(EventType::CONVERSATION_UPDATED, ['conversation' => $this->conversation]),
    ];
    $limit = (int) config('reverb.servers.reverb.max_request_size');

    foreach ($jobs as $job) {
        expect(reverbRequestBytes($job))->toBeLessThan($limit, "{$job->eventName} vượt max_request_size");
    }

    // Chứng minh ca này đúng là ca đã rơi ở ngưỡng cũ 10 000 byte.
    expect(reverbRequestBytes($jobs[0]))->toBeGreaterThan(10_000);
});
