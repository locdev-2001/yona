<?php

use App\Http\Resources\ContactResource;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;

// Ruby serialize hash rỗng thành `{}`; mảng PHP rỗng thành `[]`.
// Mọi resource emit custom_attributes/additional_attributes phải giữ hình dạng object.
function attributeMapFixtures(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create([
        'account_id' => $account->id,
        'custom_attributes' => [],
        'additional_attributes' => [],
    ]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
        'custom_attributes' => [],
        'additional_attributes' => [],
    ]);

    return [$account, $inbox, $contact, $conversation];
}

it('serializes empty conversation attribute maps as JSON objects', function () {
    [, , , $conversation] = attributeMapFixtures();

    $json = json_encode((new ConversationResource($conversation))->toArray(request()));

    expect($json)->toContain('"custom_attributes":{}')
        ->and($json)->toContain('"additional_attributes":{}');

    expect(json_encode(ConversationResource::pushEventData($conversation)))
        ->toContain('"custom_attributes":{}');
});

it('serializes empty contact attribute maps as JSON objects', function () {
    [, , $contact] = attributeMapFixtures();

    foreach ([
        json_encode((new ContactResource($contact))->toArray(request())),
        json_encode(ContactResource::pushEventData($contact)),
        json_encode(ContactResource::webhookData($contact)),
    ] as $json) {
        expect($json)->toContain('"custom_attributes":{}')
            ->and($json)->toContain('"additional_attributes":{}');
    }
});

it('serializes empty message attribute maps as JSON objects', function () {
    [$account, $inbox, $contact, $conversation] = attributeMapFixtures();

    $message = Message::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'conversation_id' => $conversation->id,
        'sender_type' => Contact::class,
        'sender_id' => $contact->id,
        'additional_attributes' => [],
    ]);

    expect(json_encode((new MessageResource($message))->toArray(request())))
        ->toContain('"additional_attributes":{}');
});

it('keeps non-empty attribute maps intact', function () {
    [, , , $conversation] = attributeMapFixtures();
    $conversation->update(['custom_attributes' => ['goi_quan_tam' => 'Nang cao']]);

    expect(json_encode((new ConversationResource($conversation->fresh()))->toArray(request())))
        ->toContain('"custom_attributes":{"goi_quan_tam":"Nang cao"}');
});
