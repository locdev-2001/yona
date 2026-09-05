<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;

// Port từ khối attachments của spec/controllers/api/v1/accounts/conversations_controller_spec.rb.

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
});

function attachmentOnMessage(Conversation $conversation, string $filename): Attachment
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

describe('GET /api/v1/accounts/{id}/conversations/{displayId}/attachments', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/attachments")
            ->assertUnauthorized();
    });

    it('returns every attachment of the conversation, newest first', function () {
        $older = attachmentOnMessage($this->conversation, 'cu.png');
        $older->forceFill(['created_at' => now()->subDay()])->save();
        $newer = attachmentOnMessage($this->conversation, 'moi.png');

        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/attachments")
            ->assertOk()
            ->assertJsonPath('meta.total_count', 2);

        expect(array_column($response->json('payload'), 'id'))->toBe([$newer->id, $older->id])
            ->and($response->json('0.data_url'))->toBeNull();
    });

    it('does not leak attachments from other conversations', function () {
        $other = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->contact->id,
        ]);
        attachmentOnMessage($other, 'khac.png');

        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/attachments")
            ->assertOk()
            ->assertJsonPath('meta.total_count', 0);
    });
});
