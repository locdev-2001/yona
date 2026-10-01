<?php

use App\Events\EventType;
use App\Jobs\ActionCableBroadcastJob;
use App\Jobs\SendReplyJob;
use App\Jobs\Webhooks\ZaloEventsJob;
use App\Jobs\Zalo\StopTypingJob;
use App\Models\Attachment;
use App\Models\Message;
use App\Models\Notification;
use App\Services\Zalo\BridgeEventService;
use App\Services\Zalo\TypingRelayService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Channels\ChannelFixture;
use Tests\Support\InboxWorkload;
use Tests\Support\QueryCounter;

// Trần số truy vấn của các luồng hộp thư trên một account cỡ production. Đo
// 01/10/2026 trước khi sửa: thông báo 610, sự kiện Zalo đến 226, gửi ảnh 119,
// SendReplyJob 94, danh sách tin 58, agent gõ phím 50, tắt đang nhập 47. Sau khi
// dùng chung Account/Contact/User trong một request/job (#155): Zalo đến 81 → 61,
// gửi ảnh 70 → 55, SendReplyJob 21 → 16, broadcast hội thoại 19 → 9. Trần = số
// sau khi sửa cộng chút dư; vượt trần là N+1 hoặc truy vấn lặp vừa quay lại —
// đọc report() để biết câu nào.

function inboxFlowQueries(InboxWorkload $load, string $flow): QueryCounter
{
    $test = test();
    $account = $load->account;
    $conversation = $load->conversation;
    $conversationApi = "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}";

    return match ($flow) {
        'inbox page' => QueryCounter::measure(fn () => $test->get("/app/accounts/{$account->id}/inbox/{$load->inbox->id}")->assertOk()),
        'conversation page' => QueryCounter::measure(fn () => $test->get("/app/accounts/{$account->id}/conversations/{$conversation->display_id}")->assertOk()),
        'conversation list' => QueryCounter::measure(fn () => $test->getJson("/api/v1/accounts/{$account->id}/conversations?status=open&assignee_type=all")->assertOk()),
        'conversation detail' => QueryCounter::measure(fn () => $test->getJson($conversationApi)->assertOk()),
        'message list' => QueryCounter::measure(fn () => $test->getJson("{$conversationApi}/messages")->assertOk()),
        'notification list' => QueryCounter::measure(fn () => $test->getJson("/api/v1/accounts/{$account->id}/notifications")->assertOk()),
        'agent typing' => QueryCounter::measure(fn () => $test->postJson("{$conversationApi}/toggle_typing_status", ['typing_status' => 'on'])->assertOk()),
        'send image' => QueryCounter::measure(fn () => $test->post("{$conversationApi}/messages", [
            'content' => 'Ảnh đây',
            'attachments' => [UploadedFile::fake()->image('anh.jpg', 400, 300)],
        ], ['Accept' => 'application/json'])->assertSuccessful()),
        'send reply job' => inboxSendReplyJobQueries($load),
        'zalo inbound text' => QueryCounter::measure(fn () => (new ZaloEventsJob(inboxZaloEvent($load, 'text')))->handle(app(BridgeEventService::class))),
        'zalo inbound typing' => QueryCounter::measure(fn () => (new ZaloEventsJob(inboxZaloEvent($load, 'typing')))->handle(app(BridgeEventService::class))),
        'stop typing job' => inboxStopTypingQueries($load),
        'conversation broadcast job' => QueryCounter::measure(fn () => (new ActionCableBroadcastJob(
            ['token-a', 'token-b'],
            EventType::CONVERSATION_UPDATED->value,
            ['account_id' => $account->id, 'id' => $conversation->display_id],
        ))->handle()),
    };
}

/** @return array<string, mixed> Sự kiện bridge thật, trỏ vào hội thoại đầu của workload. */
function inboxZaloEvent(InboxWorkload $load, string $fixture): array
{
    $threadId = $load->conversation->contactInbox->source_id;
    $payload = [...ChannelFixture::load("zalo/real/{$fixture}"), 'connection_id' => $load->inbox->channel->connectionId()];

    if ($fixture === 'typing') {
        $payload['payload'][0]['threadId'] = $threadId;

        return $payload;
    }

    $payload['thread_id'] = $payload['peer_uid'] = $payload['listener_data']['uidFrom'] = $threadId;

    return $payload;
}

function inboxSendReplyJobQueries(InboxWorkload $load): QueryCounter
{
    $message = $load->conversation->messages()->create([
        'account_id' => $load->account->id,
        'inbox_id' => $load->inbox->id,
        'message_type' => Message::TYPE_OUTGOING,
        'sender_type' => 'User',
        'sender_id' => $load->admin->id,
        'content' => 'Gửi anh ảnh',
    ]);
    $message->attachments()->create([
        'account_id' => $load->account->id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => 'attachments/budget/anh.jpg',
        'filename' => 'anh.jpg',
        'content_type' => 'image/jpeg',
        'byte_size' => 2048,
    ]);
    $job = unserialize(serialize(new SendReplyJob($message->fresh())));

    return QueryCounter::measure(fn () => $job->handle());
}

function inboxStopTypingQueries(InboxWorkload $load): QueryCounter
{
    Cache::put(TypingRelayService::stampKey($load->conversation), 'stamp', 60);
    $job = new StopTypingJob($load->conversation->fresh(), 'stamp');

    return QueryCounter::measure(fn () => $job->handle(app(TypingRelayService::class)));
}

beforeEach(function () {
    Storage::fake('public');
    Storage::fake('local');
    $this->load = InboxWorkload::build();
    Queue::fake();
    $this->actingAs($this->load->admin);
});

const INBOX_FLOW_CEILINGS = [
    'inbox page' => 15,
    'conversation page' => 12,
    'conversation list' => 25,
    'conversation detail' => 17,
    'message list' => 21,
    'notification list' => 46,
    'agent typing' => 12,
    'send image' => 60,
    'send reply job' => 18,
    'zalo inbound text' => 66,
    'zalo inbound typing' => 14,
    'stop typing job' => 8,
    'conversation broadcast job' => 11,
];

// Một workload cho mọi luồng (dựng workload là phần đắt nhất của test); luồng
// ghi dữ liệu chạy sau luồng chỉ đọc nên không đổi số của nhau.
it('giữ số truy vấn của mọi luồng hộp thư dưới trần', function () {
    $overBudget = [];

    foreach (INBOX_FLOW_CEILINGS as $flow => $ceiling) {
        $queries = inboxFlowQueries($this->load, $flow);

        if ($queries->count() > $ceiling) {
            $overBudget[] = "{$flow} (trần {$ceiling}): {$queries->report()}";
        }
    }

    expect($overBudget)->toBe([], implode(PHP_EOL, $overBudget));
});

// pg_stat_statements production 01/10: `accounts`/`users` theo id từng dòng đứng
// đầu bảng số lần gọi. Một luồng chỉ được nạp mỗi account/contact/user một lần.
it('mỗi luồng chỉ nạp mỗi account, contact, user một lần', function () {
    $repeatedLookups = [];

    foreach (array_keys(INBOX_FLOW_CEILINGS) as $flow) {
        $queries = inboxFlowQueries($this->load, $flow);
        $lookups = array_count_values(array_filter(array_map(
            fn (string $sql) => preg_match('/^select \* from "(accounts|contacts|users)" where "(?:\1"\.")?id" = \? limit 1$/', $sql, $m) ? $m[1] : null,
            $queries->statements(),
        )));

        foreach (array_filter($lookups, fn (int $times) => $times > 1) as $table => $times) {
            $repeatedLookups[] = "{$flow}: {$table} {$times}x".PHP_EOL.$queries->report();
        }
    }

    expect($repeatedLookups)->toBe([], implode(PHP_EOL, $repeatedLookups));
});

// Trang thông báo dài gấp đôi không được thêm truy vấn: mọi quan hệ nạp gộp.
it('trang thông báo không tăng truy vấn theo số thông báo', function () {
    $short = inboxFlowQueries($this->load, 'notification list');

    foreach ($this->load->conversations as $conversation) {
        Notification::factory()->ofType('conversation_assignment')->create([
            'account_id' => $this->load->account->id,
            'user_id' => $this->load->admin->id,
            'primary_actor_id' => $conversation->id,
        ]);
    }

    $long = inboxFlowQueries($this->load, 'notification list');

    expect($long->count())->toBeLessThanOrEqual($short->count(), $long->report());
});

it('danh sách tin không tăng truy vấn theo số tin', function () {
    $short = inboxFlowQueries($this->load, 'message list');

    foreach (range(1, 10) as $position) {
        $this->load->conversation->messages()->create([
            'account_id' => $this->load->account->id,
            'inbox_id' => $this->load->inbox->id,
            'message_type' => $position % 2 === 0 ? Message::TYPE_OUTGOING : Message::TYPE_INCOMING,
            'sender_type' => $position % 2 === 0 ? 'User' : 'Contact',
            'sender_id' => $position % 2 === 0 ? $this->load->agents[$position % 3]->id : $this->load->conversation->contact_id,
            'content' => "Thêm {$position}",
        ]);
    }

    $long = inboxFlowQueries($this->load, 'message list');

    expect($long->count())->toBeLessThanOrEqual($short->count(), $long->report());
});
