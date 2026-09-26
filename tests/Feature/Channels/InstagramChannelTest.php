<?php

use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/services/instagram/message_text_spec.rb +
// spec/controllers/webhooks/instagram_controller_spec.rb.

beforeEach(function () {
    config()->set('services.instagram.app_secret', 'ig-secret');
    config()->set('services.instagram.verify_token', 'ig-verify');
    $this->inbox = Inbox::factory()->instagram()->create();
    $this->inbox->channel->update(['instagram_id' => 'instagram-business-id']);
});

function instagramPost(array $payload, string $secret = 'ig-secret'): TestResponse
{
    $body = json_encode($payload);

    return test()->call('POST', '/webhooks/instagram', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $body, $secret),
    ], $body);
}

it('trả hub.challenge cho verify token Instagram', function () {
    $this->get('/webhooks/instagram?hub_verify_token=ig-verify&hub_challenge=77')->assertOk()->assertSee('77');
});

it('từ chối payload ký sai', function () {
    instagramPost(ChannelFixture::load('instagram_messaging'), 'sai')->assertStatus(401);

    expect(Message::query()->count())->toBe(0);
});

it('từ chối object khác instagram', function () {
    $payload = ChannelFixture::load('instagram_messaging');
    $payload['object'] = 'page';

    instagramPost($payload)->assertStatus(422);
});

it('tạo liên hệ, hội thoại và tin đến từ Instagram', function () {
    Http::fake([
        'graph.instagram.com/*' => Http::response([
            'id' => 'ig-user-id',
            'name' => 'Khách IG',
            'username' => 'khach_ig',
            'profile_pic' => 'https://ig/pic.jpg',
            'follower_count' => 12,
        ]),
    ]);

    instagramPost(ChannelFixture::load('instagram_messaging'))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Xin chào từ Instagram')
        ->and($message->source_id)->toBe('mid.instagram.1')
        ->and($message->conversation->contact->name)->toBe('Khách IG')
        ->and($message->conversation->contact->additional_attributes['social_instagram_user_name'])->toBe('khach_ig')
        ->and($message->conversation->contact->additional_attributes['social_instagram_follower_count'])->toBe(12);
});

it('gửi tin đi qua Instagram Messaging API', function () {
    Http::fake([
        'graph.instagram.com/*/messages*' => Http::response(['message_id' => 'mid.ig.out']),
        'graph.instagram.com/*' => Http::response(['id' => 'ig-user-id', 'name' => 'Khách IG', 'username' => 'khach_ig']),
    ]);
    instagramPost(ChannelFixture::load('instagram_messaging'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'instagram-business-id/messages')
        && $request['recipient'] === ['id' => 'ig-user-id']);

    expect($outgoing->fresh()->source_id)->toBe('mid.ig.out');
});

it('trả lời trích dẫn trên Instagram bằng reply_to.mid ở cấp gốc body', function () {
    Http::fake([
        'graph.instagram.com/*/messages*' => Http::response(['message_id' => 'mid.ig.out']),
        'graph.instagram.com/*' => Http::response(['id' => 'ig-user-id', 'name' => 'Khách IG', 'username' => 'khach_ig']),
    ]);
    instagramPost(ChannelFixture::load('instagram_messaging'));
    $quoted = Message::query()->latest('id')->first();
    $conversation = $quoted->conversation;

    $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ còn ạ',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'instagram-business-id/messages')
        && $request['reply_to'] === ['mid' => 'mid.instagram.1']
        && $request['message'] === ['text' => 'Dạ còn ạ']);
});

// Instagram khai outbound_quick_reply (Renderers\InstagramRenderer dùng lại đúng
// định dạng của Messenger) nên tin có lựa chọn ra chip gốc, không hạ xuống chữ đánh số.
it('gửi tin có lựa chọn qua Instagram Messaging API mang quick_replies dạng gốc', function () {
    Http::fake([
        'graph.instagram.com/*/messages*' => Http::response(['message_id' => 'mid.ig.out']),
        'graph.instagram.com/*' => Http::response(['id' => 'ig-user-id', 'name' => 'Khách IG', 'username' => 'khach_ig']),
    ]);
    instagramPost(ChannelFixture::load('instagram_messaging'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Bạn có đồng ý không?',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]],
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'instagram-business-id/messages')
        && $request['message']['text'] === 'Bạn có đồng ý không?'
        && $request['message']['quick_replies'] === [
            ['content_type' => 'text', 'title' => 'Có', 'payload' => "yona:{$outgoing->id}:yes"],
            ['content_type' => 'text', 'title' => 'Không', 'payload' => "yona:{$outgoing->id}:no"],
        ]);

    expect($outgoing->fresh()->source_id)->toBe('mid.ig.out');
});

it('chip quick_reply yona:{id}:{value} trên Instagram ghi submitted_values, không tạo tin đến mang payload thô', function () {
    // Tin câu hỏi tự dispatch SendReplyJob thật (Message::booted), fake trước để không gọi mạng.
    Http::fake(['graph.instagram.com/*' => Http::response(['message_id' => 'mid.ig.question'])]);
    $conversation = Conversation::factory()->create(['account_id' => $this->inbox->account_id, 'inbox_id' => $this->inbox->id]);
    $conversation->contactInbox->update(['source_id' => 'ig-user-id']);
    $question = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Bạn có đồng ý không?',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]],
    ]);
    $countBefore = Message::count();

    $payload = ChannelFixture::load('instagram_messaging');
    $payload['entry'][0]['messaging'][0]['message'] = [
        'mid' => 'mid.instagram.qr',
        'quick_reply' => ['payload' => "yona:{$question->id}:no"],
    ];

    instagramPost($payload)->assertOk();

    expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Không', 'value' => 'no']])
        ->and(Message::count())->toBe($countBefore + 1);
});

it('chip quick_reply trỏ tới tin của khách khác cùng hộp thư trên Instagram bị bỏ qua', function () {
    Http::fake([
        'graph.instagram.com/*' => Http::response(['id' => 'ig-user-id', 'name' => 'Khách IG', 'username' => 'khach_ig']),
    ]);
    $conversation = Conversation::factory()->create(['account_id' => $this->inbox->account_id, 'inbox_id' => $this->inbox->id]);
    $conversation->contactInbox->update(['source_id' => 'khach-khac']);
    $question = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Bạn có đồng ý không?',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Có', 'value' => 'yes']]],
    ]);

    // Webhook gửi từ 'ig-user-id' (fixture mặc định) — khác người với chủ tin trên.
    $payload = ChannelFixture::load('instagram_messaging');
    $payload['entry'][0]['messaging'][0]['message'] = [
        'mid' => 'mid.instagram.qr-wrong',
        'text' => 'Có',
        'quick_reply' => ['payload' => "yona:{$question->id}:yes"],
    ];

    instagramPost($payload)->assertOk();

    expect($question->fresh()->content_attributes)->not->toHaveKey('submitted_values')
        ->and(Message::query()->where('source_id', 'mid.instagram.qr-wrong')->exists())->toBeTrue();
});

it('bấm chip của câu đã trả lời trên Instagram thì tin khách vẫn tới nhân viên như tin thường', function () {
    Http::fake([
        'graph.instagram.com/*' => Http::response(['id' => 'ig-user-id', 'name' => 'Khách IG', 'username' => 'khach_ig']),
    ]);
    $conversation = Conversation::factory()->create(['account_id' => $this->inbox->account_id, 'inbox_id' => $this->inbox->id]);
    $conversation->contactInbox->update(['source_id' => 'ig-user-id']);
    $question = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Bạn có đồng ý không?',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]],
    ]);
    $question->update(['content_attributes' => [...$question->content_attributes, 'submitted_values' => [['title' => 'Có', 'value' => 'yes']]]]);

    $payload = ChannelFixture::load('instagram_messaging');
    $payload['entry'][0]['messaging'][0]['message'] = [
        'mid' => 'mid.instagram.qr-late',
        'text' => 'Không',
        'quick_reply' => ['payload' => "yona:{$question->id}:no"],
    ];

    instagramPost($payload)->assertOk();

    expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Có', 'value' => 'yes']])
        ->and(Message::query()->where('source_id', 'mid.instagram.qr-late')->where('content', 'Không')->exists())->toBeTrue();
});
