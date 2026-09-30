<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/contacts/attachments_controller_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->contact->id,
    ]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->addMembers([$this->agent->id]);
    $this->url = "/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/attachments";
});

function contactAttachment(Conversation $conversation, string $filename): Attachment
{
    $message = Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
    ]);

    $attachment = new Attachment([
        'account_id' => $conversation->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'disk' => 'public',
        'path' => "attachments/{$conversation->account_id}/{$filename}",
        'filename' => $filename,
        'content_type' => 'image/png',
        'byte_size' => 128,
    ]);
    $attachment->attachable()->associate($message);
    $attachment->save();

    return $attachment;
}

it('returns unauthorized for an unauthenticated user', function () {
    $this->getJson($this->url)->assertUnauthorized();
});

it('returns attachments of every conversation of the contact, newest first', function () {
    $older = contactAttachment($this->conversation, 'cu.png');
    $older->forceFill(['created_at' => now()->subDay()])->save();
    $newer = contactAttachment($this->conversation, 'moi.png');

    $response = $this->actingAs($this->agent)->getJson($this->url)
        ->assertOk()
        ->assertJsonPath('meta.total_count', 2);

    expect(array_column($response->json('payload'), 'id'))->toBe([$newer->id, $older->id])
        ->and($response->json('payload.0.conversation_id'))->toBe($this->conversation->display_id)
        ->and($response->json('payload.0.created_at'))->toBeInt();
});

it('never returns attachments of another contact', function () {
    $otherContact = Contact::factory()->create(['account_id' => $this->account->id]);
    contactAttachment($this->conversation, 'cua-nguoi-khac.png');

    $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$otherContact->id}/attachments")
        ->assertOk()
        ->assertJsonPath('meta.total_count', 0);
});

it('loại đính kèm của tin sticker khỏi danh sách và total_count', function () {
    $photo = contactAttachment($this->conversation, 'anh.png');
    $sticker = contactAttachment($this->conversation, 'static.png');
    $sticker->attachable->update(['content_type' => Message::CONTENT_TYPES['sticker']]);

    $this->actingAs($this->agent)->getJson($this->url)
        ->assertOk()
        ->assertJsonPath('meta.total_count', 1)
        ->assertJsonCount(1, 'payload')
        ->assertJsonPath('payload.0.id', $photo->id);
});
