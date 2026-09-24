<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

// Nguồn nhắc tên khi trả lời trong nhóm: người vừa nhắn trước, rồi danh bạ nhóm
// của kênh. Bridge Zalo giả bằng Http::fake.

beforeEach(function () {
    $this->inbox = Inbox::factory()->zalo()->create();
    $this->inbox->channel->update(['zalo_uid' => '7700000000000001']);
    $this->account = Account::find($this->inbox->account_id);
    $this->group = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'additional_attributes' => ['thread_id' => 'g1', 'thread_type' => Zalo::THREAD_TYPE_GROUP],
    ]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $this->inbox->addMembers([$this->agent->id]);
});

function groupMembersUrl(Account $account, Conversation $conversation): string
{
    return "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/group_members";
}

/** @param list<array<string, mixed>> $members */
function fakeGroupMembersBridge(array $members, int $status = 200): void
{
    Http::fake([
        zaloBridgePattern('ui/group-members*') => Http::response(
            $status === 200 ? ['ok' => true, 'members' => $members, 'creator_id' => null] : ['ok' => false, 'message' => 'not_logged_in'],
            $status,
        ),
        zaloBridgePattern('*') => Http::response(['ok' => true, 'source_id' => 'sent-1']),
    ]);
}

function groupIncomingFrom(Conversation $conversation, string $externalId, string $name): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => "tin của {$name}",
        'content_attributes' => ['sender' => ['external_id' => $externalId, 'name' => $name, 'avatar' => null]],
    ]);
}

function groupMemberRequests(): int
{
    return collect(Http::recorded())
        ->filter(fn (array $pair) => str_contains($pair[0]->url(), '/ui/group-members'))
        ->count();
}

it('hội thoại 1-1 trả danh sách rỗng và không gọi bridge', function () {
    fakeGroupMembersBridge([]);
    $direct = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'additional_attributes' => ['thread_id' => '8800000000000002', 'thread_type' => 0],
    ]);

    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $direct))
        ->assertOk()
        ->assertExactJson(['payload' => []]);

    Http::assertNothingSent();
});

it('nhóm: người vừa nhắn đứng đầu, rồi danh bạ theo tên, bỏ chính tài khoản shop', function () {
    fakeGroupMembersBridge([
        ['id' => '7700000000000001', 'name' => 'Shop', 'avatar' => null, 'role' => 'owner'],
        ['id' => '303', 'name' => 'Đạt', 'avatar' => 'https://cdn.zalo.test/dat.jpg', 'role' => 'member'],
        ['id' => '101', 'name' => 'An', 'avatar' => '', 'role' => 'member'],
        ['id' => '202', 'name' => 'Bình (danh bạ)', 'avatar' => 'https://cdn.zalo.test/binh.jpg', 'role' => 'admin'],
        ['id' => '404', 'name' => '', 'avatar' => null, 'role' => 'member'],
    ]);
    groupIncomingFrom($this->group, '202', 'Bình');
    groupIncomingFrom($this->group, '505', 'Chi');
    groupIncomingFrom($this->group, '202', 'Bình');

    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $this->group))
        ->assertOk()
        ->assertExactJson(['payload' => [
            ['external_id' => '202', 'name' => 'Bình (danh bạ)', 'avatar' => 'https://cdn.zalo.test/binh.jpg'],
            ['external_id' => '505', 'name' => 'Chi', 'avatar' => null],
            ['external_id' => '101', 'name' => 'An', 'avatar' => null],
            ['external_id' => '303', 'name' => 'Đạt', 'avatar' => 'https://cdn.zalo.test/dat.jpg'],
        ]]);

    Http::assertSent(fn (ClientRequest $request) => str_contains($request->url(), '/ui/group-members')
        && (string) $request['lite'] === '1'
        && $request['group_id'] === 'g1'
        && $request->hasHeader('X-Bridge-UI-Secret'));
});

it('người nhắn gần nhất đứng đầu, theo thứ tự thời gian lùi dần', function () {
    fakeGroupMembersBridge([]);
    groupIncomingFrom($this->group, '101', 'Lê Đức');
    groupIncomingFrom($this->group, '202', 'Trần Thị An');
    groupIncomingFrom($this->group, '303', 'Nguyễn Văn Bình');

    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $this->group))
        ->assertOk()
        ->assertJsonPath('payload.*.name', ['Nguyễn Văn Bình', 'Trần Thị An', 'Lê Đức']);
});

it('nhóm hơn 300 tin đến vẫn gợi ý người vừa nhắn, người chỉ nhắn từ rất lâu trôi khỏi danh sách', function () {
    fakeGroupMembersBridge([]);
    $startedAt = now()->subDay();
    $incomingAt = fn (string $externalId, string $name, DateTimeInterface $at) => [
        'account_id' => $this->group->account_id,
        'inbox_id' => $this->group->inbox_id,
        'conversation_id' => $this->group->id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => "tin của {$name}",
        'content_attributes' => json_encode(['sender' => ['external_id' => $externalId, 'name' => $name, 'avatar' => null]]),
        'created_at' => $at,
        'updated_at' => $at,
    ];

    Message::query()->insert([
        $incomingAt('101', 'Lê Đức', $startedAt),
        ...collect(range(1, 300))->map(fn (int $minute) => $incomingAt('202', 'Trần Thị An', $startedAt->copy()->addMinutes($minute)))->all(),
        $incomingAt('303', 'Nguyễn Văn Bình', now()),
    ]);

    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $this->group))
        ->assertOk()
        ->assertJsonPath('payload.*.name', ['Nguyễn Văn Bình', 'Trần Thị An']);
});

it('gọi lần hai trong mười phút thì dùng lại danh bạ đã lấy', function () {
    fakeGroupMembersBridge([['id' => '101', 'name' => 'An', 'avatar' => null]]);

    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $this->group))->assertOk();
    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $this->group))
        ->assertOk()
        ->assertJsonPath('payload.0.name', 'An');

    expect(groupMemberRequests())->toBe(1);
});

it('bridge lỗi vẫn trả người vừa nhắn và không giữ lỗi trong cache', function () {
    fakeGroupMembersBridge([], 503);
    groupIncomingFrom($this->group, '505', 'Chi');

    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $this->group))
        ->assertOk()
        ->assertExactJson(['payload' => [['external_id' => '505', 'name' => 'Chi', 'avatar' => null]]]);
    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $this->group))->assertOk();

    expect(groupMemberRequests())->toBe(2);
});

it('hộp thư không có luồng nhóm thì 422 capability_not_supported', function () {
    $inbox = Inbox::factory()->telegram()->create(['account_id' => $this->account->id]);
    $inbox->addMembers([$this->agent->id]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $inbox->id]);

    $this->actingAs($this->agent)->getJson(groupMembersUrl($this->account, $conversation))
        ->assertStatus(422)
        ->assertJsonPath('message', 'capability_not_supported');
});

it('người không xem được hội thoại nhận 401, hội thoại không tồn tại nhận 404', function () {
    $outsider = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id, 'role' => AccountUser::ROLE_AGENT]);

    $this->actingAs($outsider)->getJson(groupMembersUrl($this->account, $this->group))->assertUnauthorized();
    $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/conversations/999999/group_members")
        ->assertNotFound();
});

describe('POST messages mang mentions', function () {
    it('JSON: trả về mentions đã neo theo nội dung', function () {
        fakeGroupMembersBridge([]);

        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->group->display_id}/messages", [
                'content' => 'Nhờ @Bình xem giúp',
                'content_attributes' => ['mentions' => [['external_id' => '202', 'name' => 'Bình', 'offset' => 0]]],
            ])
            ->assertOk()
            ->assertJsonPath('content_attributes.mentions', [
                ['external_id' => '202', 'name' => 'Bình', 'offset' => 4, 'length' => 5],
            ]);
    });

    it('multipart: content_attributes là chuỗi JSON cạnh tệp đính kèm', function () {
        Storage::fake('public');
        fakeGroupMembersBridge([]);

        $this->actingAs($this->agent)
            ->post("/api/v1/accounts/{$this->account->id}/conversations/{$this->group->display_id}/messages", [
                'content' => '@Bình ảnh đơn đây',
                'content_attributes' => json_encode(['mentions' => [['external_id' => '202', 'name' => 'Bình', 'offset' => 0]]]),
                'attachments' => [UploadedFile::fake()->image('don.png')],
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('content_attributes.mentions.0.offset', 0)
            ->assertJsonPath('content_attributes.mentions.0.length', 5);
    });
});
