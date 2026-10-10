<?php

use App\Builders\ContactInboxBuilder;
use App\Builders\ConversationBuilder;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;

// Kênh khai conversation_outbound_resume mà chưa có harness contract: hội thoại người trực tự
// mở trên địa chỉ khách sẵn có (không mang thuộc tính nào của hội thoại cũ) gửi tin thật
// tới đúng khách qua API của nền tảng.

dataset('kênh mở lại hội thoại', [
    'Instagram' => ['instagram', 'ig-user-1', ['graph.instagram.com/*' => ['message_id' => 'mid.ig.resume']],
        fn (HttpRequest $request) => str_contains($request->url(), '/messages') && $request['recipient'] === ['id' => 'ig-user-1']
            && $request['message']['text'] === 'chào lại anh chị'],
    'LINE' => ['line', 'U4af4980629', ['api.line.me/v2/bot/message/push' => []],
        fn (HttpRequest $request) => $request->url() === 'https://api.line.me/v2/bot/message/push' && $request['to'] === 'U4af4980629'
            && $request['messages'][0]['text'] === 'chào lại anh chị'],
    'SMS' => ['sms', '+15557654321', ['messaging.bandwidth.com/*' => ['id' => 'bw-resume']],
        fn (HttpRequest $request) => str_contains($request->url(), 'messaging.bandwidth.com') && $request['to'] === '+15557654321'
            && $request['text'] === 'chào lại anh chị'],
    'Twilio SMS' => ['twilioSms', '+15557654321', ['api.twilio.com/*' => ['sid' => 'SMresume']],
        fn (HttpRequest $request) => str_contains($request->url(), 'Messages.json') && $request['To'] === '+15557654321'
            && $request['Body'] === 'chào lại anh chị'],
    'WhatsApp' => ['whatsapp', '15557654321', ['*' => ['messages' => [['id' => 'wamid.resume']]]],
        fn (HttpRequest $request) => str_contains($request->url(), '/messages') && $request['to'] === '15557654321'
            && ($request['text']['body'] ?? $request['text'] ?? null) === 'chào lại anh chị'],
]);

it('mở hội thoại mới trên địa chỉ khách sẵn có rồi gửi tin chữ tới đúng khách', function (string $factoryState, string $sourceId, array $fakes, Closure $sentToCustomer) {
    Http::fake(array_map(static fn (array $body) => Http::response($body), $fakes));
    $inbox = Inbox::factory()->{$factoryState}()->create(['lock_to_single_conversation' => false]);
    $contact = Contact::factory()->create(['account_id' => $inbox->account_id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id, 'source_id' => $sourceId]);
    $previous = Conversation::factory()->create([
        'account_id' => $inbox->account_id, 'inbox_id' => $inbox->id, 'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id, 'status' => Conversation::STATUS_RESOLVED,
    ]);

    $resumed = (new ContactInboxBuilder(contact: $contact, inbox: $inbox))->perform();
    $conversation = (new ConversationBuilder([], $resumed))->perform();
    $message = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'chào lại anh chị',
    ]);

    expect($resumed->id)->toBe($contactInbox->id)
        ->and($conversation->id)->not->toBe($previous->id)
        ->and($message->fresh()->status)->not->toBe(Message::STATUSES['failed']);
    Http::assertSent($sentToCustomer);
})->with('kênh mở lại hội thoại');
