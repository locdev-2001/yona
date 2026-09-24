<?php

use App\Jobs\SendReplyJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

// Chuyển tiếp một tin sang hội thoại khác: danh sách đích theo quyền + lý do không
// nhận được, và lệnh chuyển tạo tin mới độc lập ở từng đích.

beforeEach(function () {
    Queue::fake();
    Storage::fake('public');

    $this->account = Account::factory()->create(['locale' => 'vi']);
    $this->zaloInbox = Inbox::factory()->zalo()->create(['account_id' => $this->account->id, 'name' => 'Zalo Shop']);
    $this->apiInbox = Inbox::factory()->create(['account_id' => $this->account->id, 'name' => 'Website API']);
    $this->smsInbox = Inbox::factory()->sms()->create(['account_id' => $this->account->id, 'name' => 'SMS Shop']);
    $this->hiddenInbox = Inbox::factory()->create(['account_id' => $this->account->id, 'name' => 'Hộp thư khác']);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id, 'role' => AccountUser::ROLE_AGENT]);
    foreach ([$this->zaloInbox, $this->apiInbox, $this->smsInbox] as $inbox) {
        $inbox->addMembers([$this->agent->id]);
    }

    $this->sourceConversation = forwardApiConversation($this->zaloInbox, 'Khách A', now()->subMinutes(1));
    $this->source = forwardApiMessage($this->sourceConversation, 'Còn size M không shop?');
});

function forwardApiConversation(Inbox $inbox, string $contactName, mixed $lastActivityAt = null): Conversation
{
    $contact = Contact::factory()->create(['account_id' => $inbox->account_id, 'name' => $contactName]);

    return Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'last_activity_at' => $lastActivityAt ?? now(),
    ]);
}

/** @param array<string, mixed> $attributes */
function forwardApiMessage(Conversation $conversation, ?string $content, array $attributes = []): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => $content,
        ...$attributes,
    ]);
}

function forwardApiAttachImage(Message $message): Attachment
{
    $attachment = $message->attachments()->create(Attachment::storeUpload(UploadedFile::fake()->image('mau-ao.png', 20, 10), $message->account_id));
    $message->unsetRelation('attachments');

    return $attachment;
}

function forwardApiTargetsUrl(Account $account, Conversation $conversation, Message $message, string $query = ''): string
{
    $suffix = $query === '' ? '' : '?q='.urlencode($query);

    return "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/forward_targets{$suffix}";
}

/** @param list<int|string> $conversationIds */
function forwardApiPost(User $user, Account $account, Conversation $conversation, Message $message, array $conversationIds): TestResponse
{
    return test()->actingAs($user)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/forward",
        ['conversation_ids' => $conversationIds],
    );
}

describe('GET …/forward_targets', function () {
    it('chưa đăng nhập → 401', function () {
        $this->getJson(forwardApiTargetsUrl($this->account, $this->sourceConversation, $this->source))->assertUnauthorized();
    });

    it('ô tìm trống: hội thoại vừa hoạt động trước, bỏ hội thoại nguồn và hộp thư không được giao', function () {
        $older = forwardApiConversation($this->apiInbox, 'Chị Lan', now()->subHours(2));
        $newer = forwardApiConversation($this->smsInbox, 'Anh Bình', now()->subMinutes(5));
        forwardApiConversation($this->hiddenInbox, 'Khách ẩn', now());

        $response = $this->actingAs($this->agent)
            ->getJson(forwardApiTargetsUrl($this->account, $this->sourceConversation, $this->source))
            ->assertOk()
            ->assertJsonPath('max_targets', 10);

        expect(collect($response->json('payload'))->pluck('id')->all())->toBe([$newer->display_id, $older->display_id])
            ->and($response->json('payload.0'))->toMatchArray([
                'status' => 'open',
                'forwardable' => true,
                'code' => null,
                'reason' => null,
                'missing_capabilities' => [],
            ])
            ->and($response->json('payload.0.inbox'))->toMatchArray(['id' => $this->smsInbox->id, 'name' => 'SMS Shop', 'channel_type' => 'Channel::Sms'])
            ->and($response->json('payload.0.inbox.platform'))->toMatchArray(['key' => 'sms', 'name' => 'SMS'])
            ->and($response->json('payload.0.inbox.platform.logo_url'))->toEndWith('/brand-assets/platforms/sms.svg')
            ->and($response->json('payload.0.contact'))->toMatchArray(['name' => 'Anh Bình', 'thumbnail' => '']);
    });

    it('có từ khoá thì lọc theo tên liên hệ', function () {
        forwardApiConversation($this->apiInbox, 'Chị Lan');
        $binh = forwardApiConversation($this->smsInbox, 'Anh Bình');

        $response = $this->actingAs($this->agent)
            ->getJson(forwardApiTargetsUrl($this->account, $this->sourceConversation, $this->source, 'Bình'))
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('id')->all())->toBe([$binh->display_id]);
    });

    it('tin ảnh: dòng SMS bị làm mờ kèm lý do, dòng API vẫn nhận được', function () {
        $image = forwardApiMessage($this->sourceConversation, null);
        forwardApiAttachImage($image);
        $sms = forwardApiConversation($this->smsInbox, 'Anh Bình', now()->subMinutes(5));
        $api = forwardApiConversation($this->apiInbox, 'Chị Lan', now()->subMinutes(10));

        $rows = collect($this->actingAs($this->agent)
            ->getJson(forwardApiTargetsUrl($this->account, $this->sourceConversation, $image))
            ->assertOk()
            ->json('payload'))->keyBy('id');

        expect($rows[$sms->display_id])->toMatchArray([
            'forwardable' => false,
            'code' => 'capability_not_supported',
            'reason' => 'Hộp thư SMS Shop không gửi được ảnh.',
            'missing_capabilities' => ['outbound_image'],
        ])->and($rows[$api->display_id]['forwardable'])->toBeTrue();
    });

    it('tin nguồn là ghi chú riêng → 422 not_forwardable', function () {
        $note = forwardApiMessage($this->sourceConversation, 'Khách này hay đổi ý', ['message_type' => Message::TYPE_OUTGOING, 'private' => true]);

        $this->actingAs($this->agent)
            ->getJson(forwardApiTargetsUrl($this->account, $this->sourceConversation, $note))
            ->assertStatus(422)
            ->assertExactJson(['error' => 'Loại tin này chưa chuyển tiếp được.', 'code' => 'not_forwardable']);
    });

    it('bot không dùng màn chọn đích', function () {
        $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);

        $this->withHeader('api_access_token', $bot->accessToken->token)
            ->getJson(forwardApiTargetsUrl($this->account, $this->sourceConversation, $this->source))
            ->assertUnauthorized();
    });
});

describe('POST …/forward', function () {
    it('chuyển tin chữ sang hội thoại API: tin mới do agent gửi, mang dấu chuyển tiếp, đẩy ra kênh', function () {
        $target = forwardApiConversation($this->apiInbox, 'Chị Lan');

        $response = forwardApiPost($this->agent, $this->account, $this->sourceConversation, $this->source, [$target->display_id])
            ->assertOk()
            ->assertJsonPath('payload.0.conversation_id', $target->display_id)
            ->assertJsonPath('payload.0.ok', true);

        $forwarded = $target->messages()->sole();

        expect($forwarded->message_type)->toBe(Message::TYPE_OUTGOING)
            ->and($forwarded->private)->toBeFalse()
            ->and($forwarded->content)->toBe('Còn size M không shop?')
            ->and($forwarded->sender_type)->toBe('User')
            ->and($forwarded->sender_id)->toBe($this->agent->id)
            ->and($forwarded->content_attributes['forwarded_from'])->toBe([
                'origin' => 'internal',
                'message_id' => $this->source->id,
                'conversation_id' => $this->sourceConversation->display_id,
            ])
            ->and($response->json('payload.0.message.id'))->toBe($forwarded->id)
            ->and($response->json('payload.0.message.content_attributes.forwarded_from.origin'))->toBe('internal')
            ->and($this->sourceConversation->messages()->count())->toBe(1);

        Queue::assertPushed(SendReplyJob::class, fn (SendReplyJob $job) => $job->message->is($forwarded));
    });

    it('chuyển ảnh: bản chuyển tiếp có tệp riêng, thu hồi tin gốc không làm mất tệp của bản chuyển tiếp', function () {
        $image = forwardApiMessage($this->sourceConversation, 'Mẫu này nè', ['message_type' => Message::TYPE_OUTGOING]);
        $original = forwardApiAttachImage($image);
        $target = forwardApiConversation($this->apiInbox, 'Chị Lan');

        forwardApiPost($this->agent, $this->account, $this->sourceConversation, $image, [$target->display_id])->assertOk();

        $copy = $target->messages()->sole()->attachments()->sole();

        expect($copy->path)->not->toBe($original->path)
            ->and($copy->filename)->toBe('mau-ao.png')
            ->and($copy->content_type)->toBe($original->content_type)
            ->and($copy->byte_size)->toBe($original->byte_size)
            ->and($copy->file_type)->toBe(Attachment::FILE_TYPE_IMAGE);
        Storage::disk('public')->assertExists($copy->path);

        $image->markDeleted('vi');

        Storage::disk('public')->assertMissing($original->path);
        Storage::disk('public')->assertExists($copy->path);
    });

    it('hai đích độc lập: API nhận, SMS từ chối ảnh; không để lại bản sao mồ côi', function () {
        $image = forwardApiMessage($this->sourceConversation, null);
        forwardApiAttachImage($image);
        $api = forwardApiConversation($this->apiInbox, 'Chị Lan');
        $sms = forwardApiConversation($this->smsInbox, 'Anh Bình');

        $response = forwardApiPost($this->agent, $this->account, $this->sourceConversation, $image, [$api->display_id, $sms->display_id])
            ->assertOk();

        expect($response->json('payload.0'))->toMatchArray(['conversation_id' => $api->display_id, 'ok' => true])
            ->and($response->json('payload.1'))->toBe([
                'conversation_id' => $sms->display_id,
                'ok' => false,
                'code' => 'capability_not_supported',
                'error' => 'Hộp thư SMS Shop không gửi được ảnh.',
            ])
            ->and($sms->messages()->count())->toBe(0)
            ->and(Storage::disk('public')->allFiles())->toHaveCount(2);
    });

    it('tệp gốc đã mất trên đĩa → attachment_unavailable cho đích, không tạo tin', function () {
        $image = forwardApiMessage($this->sourceConversation, null);
        $original = forwardApiAttachImage($image);
        Storage::disk('public')->delete($original->path);
        $target = forwardApiConversation($this->apiInbox, 'Chị Lan');

        forwardApiPost($this->agent, $this->account, $this->sourceConversation, $image, [$target->display_id])
            ->assertOk()
            ->assertJsonPath('payload.0.ok', false)
            ->assertJsonPath('payload.0.code', 'attachment_unavailable')
            ->assertJsonPath('payload.0.error', 'Tệp mau-ao.png không còn trên máy chủ nên không chuyển tiếp được.');

        expect($target->messages()->count())->toBe(0);
    });

    it('hội thoại của account khác hoặc hộp thư không được giao → target_not_found', function () {
        $foreign = forwardApiConversation(Inbox::factory()->create(), 'Người lạ');
        $hidden = forwardApiConversation($this->hiddenInbox, 'Khách ẩn');

        $response = forwardApiPost($this->agent, $this->account, $this->sourceConversation, $this->source, [$foreign->display_id + 1000, $hidden->display_id])
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('code')->all())->toBe(['target_not_found', 'target_not_found'])
            ->and($response->json('payload.0.error'))->toBe('Không tìm thấy hội thoại hoặc bạn không có quyền.')
            ->and($hidden->messages()->count())->toBe(0);
    });

    it('danh sách đích rỗng hoặc sai → no_targets; quá 10 → too_many_targets', function () {
        forwardApiPost($this->agent, $this->account, $this->sourceConversation, $this->source, [])
            ->assertStatus(422)
            ->assertExactJson(['error' => 'Chọn ít nhất một hội thoại.', 'code' => 'no_targets']);

        forwardApiPost($this->agent, $this->account, $this->sourceConversation, $this->source, ['abc'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'no_targets');

        forwardApiPost($this->agent, $this->account, $this->sourceConversation, $this->source, range(1, 11))
            ->assertStatus(422)
            ->assertExactJson(['error' => 'Mỗi lần chuyển tiếp tối đa 10 hội thoại.', 'code' => 'too_many_targets']);
    });

    it('nội dung có chuỗi Liquid được giữ nguyên văn ở đích', function () {
        $liquid = forwardApiMessage($this->sourceConversation, 'Chào {{contact.name}} nhé');
        $target = forwardApiConversation($this->apiInbox, 'Chị Lan');

        forwardApiPost($this->agent, $this->account, $this->sourceConversation, $liquid, [$target->display_id])->assertOk();

        expect($target->messages()->sole()->content)->toBe('Chào {{contact.name}} nhé');
    });

    it('đích là hộp thư email: thân thư được dựng như tin agent gõ tay', function () {
        $emailInbox = Inbox::factory()->email()->create(['account_id' => $this->account->id]);
        $emailInbox->addMembers([$this->agent->id]);
        $target = forwardApiConversation($emailInbox, 'Chị Lan');

        forwardApiPost($this->agent, $this->account, $this->sourceConversation, $this->source, [$target->display_id])
            ->assertOk()
            ->assertJsonPath('payload.0.ok', true);

        expect(data_get($target->messages()->sole()->content_attributes, 'email.html_content.full'))->toContain('Còn size M không shop?');
    });

    it('bot chuyển tiếp bằng api_access_token', function () {
        $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);
        $target = forwardApiConversation($this->apiInbox, 'Chị Lan');

        $this->withHeader('api_access_token', $bot->accessToken->token)
            ->postJson(
                "/api/v1/accounts/{$this->account->id}/conversations/{$this->sourceConversation->display_id}/messages/{$this->source->id}/forward",
                ['conversation_ids' => [$target->display_id]],
            )
            ->assertOk()
            ->assertJsonPath('payload.0.ok', true);

        expect($target->messages()->sole()->sender_type)->toBe('AgentBot');
    });

    it('sticker Zalo sang hội thoại Zalo khác: tin sticker dựng lại từ danh mục, có dấu chuyển tiếp', function () {
        $sticker = forwardApiMessage($this->sourceConversation, null, [
            'content_type' => Message::CONTENT_TYPES['sticker'],
            'content_attributes' => ['sticker' => ['id' => 98930, 'catId' => 61900, 'type' => 7, 'url' => 'https://zalo-api.zadn.vn/sticker/98930.webp']],
        ]);
        $otherZaloInbox = Inbox::factory()->zalo()->create(['account_id' => $this->account->id]);
        $otherZaloInbox->addMembers([$this->agent->id]);
        $target = forwardApiConversation($otherZaloInbox, 'Chị Lan');

        forwardApiPost($this->agent, $this->account, $this->sourceConversation, $sticker, [$target->display_id])
            ->assertOk()
            ->assertJsonPath('payload.0.ok', true);

        $forwarded = $target->messages()->sole();

        expect($forwarded->content_type)->toBe(Message::CONTENT_TYPES['sticker'])
            ->and($forwarded->content_attributes['sticker'])->toMatchArray(['id' => 98930, 'cateId' => 61900, 'type' => 7])
            ->and($forwarded->content_attributes['forwarded_from']['message_id'])->toBe($sticker->id)
            ->and($forwarded->attachments()->sole()->external_url)->toBe('https://zalo-api.zadn.vn/sticker/98930.webp');
    });
});
