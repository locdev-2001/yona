<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->agent->inboxes()->attach($this->inbox->id);

    $this->contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->contact->id,
    ]);
});

function conversationSearchMessage(Conversation $conversation, string $content, int $minutesAgo = 0): Message
{
    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'content' => $content,
        'created_at' => now()->subMinutes($minutesAgo),
    ]);
}

function conversationSearchUrl(Conversation $conversation, string $query): string
{
    return "/api/v1/accounts/{$conversation->account_id}/conversations/{$conversation->display_id}/search/messages?q=".urlencode($query);
}

describe('GET /api/v1/accounts/{id}/conversations/{displayId}/search/messages', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson(conversationSearchUrl($this->conversation, 'gia'))->assertUnauthorized();
    });

    it('returns ids of matching messages in this conversation only, newest first, accent-insensitive', function () {
        $older = conversationSearchMessage($this->conversation, 'Số tài khoản 0123', 30);
        $newer = conversationSearchMessage($this->conversation, 'so tai khoan moi', 5);
        conversationSearchMessage($this->conversation, 'Cảm ơn anh', 1);
        $sibling = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->contact->id,
        ]);
        conversationSearchMessage($sibling, 'Số tài khoản khác');

        $this->actingAs($this->agent)
            ->getJson(conversationSearchUrl($this->conversation, 'số tài khoản'))
            ->assertOk()
            ->assertExactJson(['payload' => ['message_ids' => [$newer->id, $older->id]]]);
    });

    it('refuses a conversation in an inbox the agent is not a member of', function () {
        $hiddenInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $hidden = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $hiddenInbox->id,
            'contact_id' => $this->contact->id,
        ]);
        conversationSearchMessage($hidden, 'Số tài khoản bí mật');

        $this->actingAs($this->agent)
            ->getJson(conversationSearchUrl($hidden, 'tai khoan'))
            ->assertUnauthorized();
    });

    it('returns not found for a conversation of another account', function () {
        $otherAccount = Account::factory()->create();
        $otherInbox = Inbox::factory()->create(['account_id' => $otherAccount->id]);
        $foreign = Conversation::factory()->create(['account_id' => $otherAccount->id, 'inbox_id' => $otherInbox->id]);

        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/".($foreign->display_id + 1000).'/search/messages?q=a')
            ->assertNotFound();
    });
});
