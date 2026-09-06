<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

// Hành động agent làm TRÊN kênh: thả/gỡ biểu cảm (Q5), thu hồi hai chiều (Q4),
// báo đang gõ. Lõi trung tính + gate theo năng lực (docs/channel-capabilities.md
// §2.2); bridge được giả bằng Http::fake theo đúng hợp đồng 3 route của lô 1b.

function zaloActionsFixtures(string $channel = 'zalo'): array
{
    $account = Account::factory()->create(['locale' => 'vi']);
    $inbox = Inbox::factory()->{$channel}()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create([
        'contact_id' => $contact->id,
        'inbox_id' => $inbox->id,
        'source_id' => '9876543210',
    ]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
        'additional_attributes' => ['thread_id' => '9876543210', 'thread_type' => 0],
    ]);

    $agent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $agent->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
    $inbox->addMembers([$agent->id]);

    return [$account, $inbox, $conversation, $agent];
}

function zaloActionsMessage(Conversation $conversation, array $attributes = []): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
        'source_id' => 'msg-out-1',
        'content_attributes' => ['zca_message' => ['msgId' => 'msg-out-1', 'cliMsgId' => '1788714913519']],
        ...$attributes,
    ]);
}

/** Bridge trả OK. Http::fake CỘNG DỒN stub nên test cần lỗi phải khai stub của nó TRƯỚC. */
function zaloActionsBridgeOk(): void
{
    Http::fake(['*' => Http::response(['ok' => true])]);
}

it('thả cảm xúc: gọi đúng route bridge với mã zca và lưu cấu trúc {emoji, by, at}', function () {
    zaloActionsBridgeOk();
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    $message = zaloActionsMessage($conversation);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/reactions", ['emoji' => '👍'])
        ->assertOk();

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/personal-messages/reaction')
        && $request['icon'] === '/-strong'
        && $request['msg_id'] === 'msg-out-1'
        && $request['cli_msg_id'] === '1788714913519'
        && $request['thread_id'] === '9876543210');

    expect($message->refresh()->reactionList())->toBe([
        ['emoji' => '👍', 'by' => 'agent:'.$agent->id, 'at' => now()->getTimestamp()],
    ]);
})->freezeTime();

it('gỡ cảm xúc: gửi mã rỗng ra bridge và xoá đúng mục của agent đó', function () {
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    zaloActionsBridgeOk();
    $message = zaloActionsMessage($conversation, [
        'content_attributes' => [
            'zca_message' => ['msgId' => 'msg-out-1', 'cliMsgId' => '1788714913519'],
            'reactions' => [
                ['emoji' => '👍', 'by' => 'agent:'.$agent->id, 'at' => 1],
                ['emoji' => '❤️', 'by' => '9876543210', 'at' => 2],
            ],
        ],
    ]);

    $this->actingAs($agent)
        ->deleteJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/reactions")
        ->assertOk();

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/personal-messages/reaction') && $request['icon'] === '');

    expect($message->refresh()->reactionList())->toBe([['emoji' => '❤️', 'by' => '9876543210', 'at' => 2]]);
});

it('không lưu cảm xúc khi bridge từ chối', function () {
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    $message = zaloActionsMessage($conversation);
    Http::fake(['*' => Http::response(['ok' => false, 'code' => 'session_lost', 'message' => 'not_logged_in'], 502)]);

    $response = $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/reactions", ['emoji' => '👍'])
        ->assertStatus(422);

    expect($response->json('code'))->toBe('session_lost')
        ->and($response->json('error'))->toBe(__('errors.zalo.action.session_lost', [], 'vi'))
        ->and($message->refresh()->reactionList())->toBe([]);
});

it('từ chối 422 capability_not_supported khi kênh không khai outbound_reaction', function () {
    zaloActionsBridgeOk();
    [$account, , $conversation, $agent] = zaloActionsFixtures('telegram');
    $message = zaloActionsMessage($conversation);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/reactions", ['emoji' => '👍'])
        ->assertStatus(422);

    Http::assertNothingSent();
});

it('thu hồi: bridge undo nhận ĐỦ mọi msgId của tin rồi tin mới được đánh dấu xoá', function () {
    Storage::fake('public');
    zaloActionsBridgeOk();
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    $message = zaloActionsMessage($conversation, [
        'content_attributes' => [
            'zca_message' => ['msgId' => 'msg-out-1', 'cliMsgId' => '1788714913519'],
            'external_source_ids' => ['msg-out-1', 'msg-out-2'],
        ],
    ]);
    $message->attachments()->create(Attachment::storeUpload(UploadedFile::fake()->image('anh.png'), $account->id));
    $path = $message->attachments()->first()->path;

    $this->actingAs($agent)
        ->deleteJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}")
        ->assertOk();

    $undone = collect(Http::recorded())
        ->filter(fn (array $pair) => str_ends_with($pair[0]->url(), '/personal-messages/undo'))
        ->map(fn (array $pair) => $pair[0]->data()['msg_id'])
        ->values()
        ->all();

    expect($undone)->toBe(['msg-out-1', 'msg-out-2'])
        ->and($message->refresh()->content)->toBe(__('conversations.messages.deleted', [], 'vi'))
        ->and($message->content_attributes)->toBe(['deleted' => true])
        ->and($message->attachments()->count())->toBe(0)
        ->and(Storage::disk('public')->exists($path))->toBeFalse();
});

it('thu hồi thất bại thì GIỮ tin và trả lý do có mã', function () {
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    $message = zaloActionsMessage($conversation);
    Http::fake(['*' => Http::response(['ok' => false, 'code' => 'zalo_rejected', 'message' => 'too_old'], 502)]);

    $response = $this->actingAs($agent)
        ->deleteJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}")
        ->assertStatus(422);

    expect($response->json('code'))->toBe('zalo_rejected')
        ->and($message->refresh()->content)->toBe('Chào bạn')
        ->and($message->isDeleted())->toBeFalse();
});

it('kênh không khai outbound_recall thì xoá một chiều như bản gốc', function () {
    zaloActionsBridgeOk();
    [$account, , $conversation, $agent] = zaloActionsFixtures('telegram');
    $message = zaloActionsMessage($conversation);

    $this->actingAs($agent)
        ->deleteJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}")
        ->assertOk();

    expect($message->refresh()->isDeleted())->toBeTrue();
    Http::assertNothingSent();
});

it('agent gõ trong ô soạn thì bridge nhận typing, và chỉ một lần trong cửa sổ chặn nhịp', function () {
    zaloActionsBridgeOk();
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    Cache::flush();

    foreach (range(1, 3) as $ignored) {
        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", ['typing_status' => 'on'])
            ->assertOk();
    }

    expect(collect(Http::recorded())->filter(fn (array $pair) => str_ends_with($pair[0]->url(), '/personal-messages/typing'))->count())
        ->toBe(1);
});

it('ghi chú riêng tư và lượt tắt gõ không đẩy ra kênh', function () {
    zaloActionsBridgeOk();
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    Cache::flush();

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", ['typing_status' => 'on', 'is_private' => true])
        ->assertOk();
    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", ['typing_status' => 'off'])
        ->assertOk();

    Http::assertNothingSent();
});

// Nợ lô 1b → lô 4 (reports/zalo-lo1b-notes.md §"Việc cho phiên/lô khác" mục 1):
// zca gọi ENDPOINT KHÁC HẲN cho nhóm (group/reaction, group/undomsg, group/typing),
// nên thiếu `thread_type` là mọi thao tác trong nhóm im lặng đi sai chỗ.
it('mọi lời gọi bridge mang thread_type của luồng — nhóm ra 1, chat 1-1 ra 0', function () {
    zaloActionsBridgeOk();
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    $conversation->update(['additional_attributes' => ['thread_id' => '7788', 'thread_type' => 1]]);
    $message = zaloActionsMessage($conversation);
    Cache::flush();

    $base = "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}";

    $this->actingAs($agent)->postJson("{$base}/messages/{$message->id}/reactions", ['emoji' => '👍'])->assertOk();
    $this->actingAs($agent)->postJson("{$base}/toggle_typing_status", ['typing_status' => 'on'])->assertOk();
    $this->actingAs($agent)->deleteJson("{$base}/messages/{$message->id}")->assertOk();

    $threadTypes = collect(Http::recorded())
        ->mapWithKeys(fn (array $pair) => [basename($pair[0]->url()) => $pair[0]->data()['thread_type'] ?? null])
        ->all();

    expect($threadTypes)->toBe(['reaction' => 1, 'typing' => 1, 'undo' => 1]);
});

it('chat 1-1 vẫn gửi thread_type 0 tường minh, không bỏ trống', function () {
    zaloActionsBridgeOk();
    [$account, , $conversation, $agent] = zaloActionsFixtures();
    $message = zaloActionsMessage($conversation);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/reactions", ['emoji' => '👍'])
        ->assertOk();

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/personal-messages/reaction')
        && $request->data()['thread_type'] === 0);
});

// Concern #3 của lô 1b: bảng emoji↔mã tồn tại HAI bản (PHP đọc tin đến, bridge dịch
// tin đi) và không bản nào gọi được bản kia (PHP ↔ Node). Thêm cảm xúc mà quên một
// bên thì tin đến hiện mã thô hoặc tin đi báo "Zalo không có biểu cảm này". Test này
// là chốt duy nhất giữ hai bảng bằng nhau — cùng cách CapabilityDeclarationTest soi
// hằng số FE.
it('bảng cảm xúc của driver PHP và của bridge là một', function () {
    $parse = function (string $path): array {
        preg_match_all(
            '/^\s*([\'"])(.*?)\1\s*(?:=>|:)\s*([\'"])(.*?)\3,\s*$/m',
            file_get_contents(base_path($path)),
            $matches,
            PREG_SET_ORDER,
        );

        return collect($matches)->mapWithKeys(fn (array $one) => [$one[2] => $one[4]])->all();
    };

    $php = $parse('app/Services/Zalo/ReactionIcons.php');

    expect($php)->not->toBeEmpty()
        ->and($parse('services/zalo-bridge/src/reaction-icons.mjs'))->toBe($php);
});
