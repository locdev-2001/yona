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

function attachmentOnMessage(Conversation $conversation, string $filename, int $fileType = Attachment::FILE_TYPE_IMAGE): Attachment
{
    $message = Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
    ]);

    $attachment = new Attachment([
        'account_id' => $conversation->account_id,
        'file_type' => $fileType,
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

    it('narrows to one kind of the shared-content panel and carries the display name', function () {
        $photo = attachmentOnMessage($this->conversation, 'anh.png');
        $clip = attachmentOnMessage($this->conversation, 'clip.mp4', Attachment::FILE_TYPE_VIDEO);
        $invoice = attachmentOnMessage($this->conversation, 'hoa-don.pdf', Attachment::FILE_TYPE_FILE);
        $url = "/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/attachments";

        $media = $this->actingAs($this->agent)->getJson("{$url}?kind=media")->assertOk()->assertJsonPath('meta.total_count', 2);
        $files = $this->actingAs($this->agent)->getJson("{$url}?kind=files")->assertOk()->assertJsonPath('meta.total_count', 1);

        expect(array_column($media->json('payload'), 'id'))->toEqualCanonicalizing([$photo->id, $clip->id])
            ->and($files->json('payload.0.id'))->toBe($invoice->id)
            ->and($files->json('payload.0.filename'))->toBe('hoa-don.pdf')
            ->and($files->json('payload.0.message_id'))->toBe($invoice->attachable_id);
    });
});

describe('GET /api/v1/accounts/{id}/conversations/{displayId}/links', function () {
    function linkMessage(Conversation $conversation, string $content, int $minutesAgo = 0, array $attributes = []): Message
    {
        return Message::factory()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'content' => $content,
            'created_at' => now()->subMinutes($minutesAgo),
            ...$attributes,
        ]);
    }

    it('lists messages carrying a link, newest first, only from this conversation', function () {
        $older = linkMessage($this->conversation, 'Đơn hàng: https://shop.vn/don/1', 10);
        $newer = linkMessage($this->conversation, 'xem www.yona.vn nhé', 1);
        linkMessage($this->conversation, 'Không có liên kết nào', 0);
        linkMessage($this->conversation, 'https://yona.vn/hoat-dong', 0, ['message_type' => Message::TYPE_ACTIVITY]);
        $other = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->contact->id,
        ]);
        linkMessage($other, 'https://khac.vn');

        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/links")
            ->assertOk()
            ->assertJsonPath('meta.has_more', false);

        expect(array_column($response->json('payload'), 'message_id'))->toBe([$newer->id, $older->id])
            ->and($response->json('payload.1.content'))->toBe('Đơn hàng: https://shop.vn/don/1')
            ->and($response->json('payload.1.created_at'))->toBe($older->created_at->timestamp);
    });

    it('pages through long histories', function () {
        foreach (range(1, 21) as $minutesAgo) {
            linkMessage($this->conversation, "https://shop.vn/{$minutesAgo}", $minutesAgo);
        }
        $url = "/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/links";

        $this->actingAs($this->agent)->getJson($url)->assertJsonPath('meta.has_more', true)->assertJsonCount(20, 'payload');
        $this->actingAs($this->agent)->getJson("{$url}?page=2")
            ->assertJsonPath('meta.has_more', false)
            ->assertJsonPath('payload.0.content', 'https://shop.vn/21');
    });

    it('refuses an agent outside the inbox', function () {
        $outsider = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id]);
        linkMessage($this->conversation, 'https://shop.vn/bi-mat');

        $this->actingAs($outsider)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/links")
            ->assertUnauthorized();
    });
});
