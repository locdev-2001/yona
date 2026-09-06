<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\AgentBotInbox;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\Event;

// Port từ spec/models/conversation_spec.rb (nhánh agent bot) +
// spec/controllers/api/v1/accounts/conversations_controller_spec.rb#toggle_status
// (bot_handoff) + spec/services/conversations/assignment_service_spec.rb.

function botInboxFixtures(bool $activeBot = true): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id, 'enable_auto_assignment' => true]);
    $bot = AgentBot::factory()->create(['account_id' => $account->id]);

    AgentBotInbox::factory()->create([
        'inbox_id' => $inbox->id,
        'agent_bot_id' => $bot->id,
        'status' => $activeBot ? AgentBotInbox::STATUS_ACTIVE : AgentBotInbox::STATUS_INACTIVE,
    ]);

    return [$account, $inbox, $bot];
}

function botInboxAgent(Account $account, Inbox $inbox, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);
    $inbox->inboxMembers()->create(['user_id' => $user->id]);

    return $user;
}

it('mở hội thoại ở trạng thái pending và gán bot khi inbox có bot đang bật', function () {
    [$account, $inbox, $bot] = botInboxFixtures();

    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    expect($conversation->status)->toBe(Conversation::STATUS_PENDING)
        ->and($conversation->assignee_agent_bot_id)->toBe($bot->id);
});

it('không chạy phân công tự động cho hội thoại pending của bot', function () {
    [$account, $inbox] = botInboxFixtures();
    botInboxAgent($account, $inbox);

    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    expect($conversation->refresh()->assignee_id)->toBeNull();
});

it('giữ trạng thái open khi bot của inbox đang tắt', function () {
    [$account, $inbox] = botInboxFixtures(activeBot: false);

    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    expect($conversation->status)->toBe(Conversation::STATUS_OPEN)
        ->and($conversation->assignee_agent_bot_id)->toBeNull();
});

it('không gán bot khi hội thoại đã có người nhận việc sẵn', function () {
    [$account, $inbox] = botInboxFixtures();
    $agent = botInboxAgent($account, $inbox);

    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'assignee_id' => $agent->id,
    ]);

    expect($conversation->status)->toBe(Conversation::STATUS_PENDING)
        ->and($conversation->assignee_agent_bot_id)->toBeNull();
});

it('bot chuyển hội thoại pending sang open thì bàn giao lại cho người', function () {
    [$account, $inbox, $bot] = botInboxFixtures();
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    Event::fake([DomainEvent::class]);

    $this->withHeader('api_access_token', $bot->accessToken->token)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", [
            'status' => 'open',
        ])
        ->assertOk()
        ->assertJsonPath('payload.current_status', 'open');

    $conversation->refresh();

    expect($conversation->status)->toBe(Conversation::STATUS_OPEN)
        ->and($conversation->assignee_agent_bot_id)->toBeNull()
        ->and($conversation->assignee_id)->toBeNull()
        ->and($conversation->waiting_since)->not->toBeNull();

    Event::assertDispatched(
        DomainEvent::class,
        fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_BOT_HANDOFF
    );
});

it('bot đóng hội thoại pending vẫn đi đường toggle_status thường', function () {
    [$account, $inbox, $bot] = botInboxFixtures();
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    $this->withHeader('api_access_token', $bot->accessToken->token)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", [
            'status' => 'resolved',
        ])
        ->assertOk();

    $conversation->refresh();

    expect($conversation->status)->toBe(Conversation::STATUS_RESOLVED)
        ->and($conversation->assignee_agent_bot_id)->toBe($bot->id);
});

it('agent mở hội thoại pending thì tự nhận việc và gỡ bot', function () {
    [$account, $inbox] = botInboxFixtures();
    $agent = botInboxAgent($account, $inbox);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", [
            'status' => 'open',
        ])
        ->assertOk();

    $conversation->refresh();

    expect($conversation->status)->toBe(Conversation::STATUS_OPEN)
        ->and($conversation->assignee_agent_bot_id)->toBeNull()
        ->and($conversation->assignee_id)->toBe($agent->id);
});

it('gán agent cho hội thoại pending của bot thì mở lại hội thoại', function () {
    [$account, $inbox] = botInboxFixtures();
    $agent = botInboxAgent($account, $inbox);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/assignments", [
            'assignee_id' => $agent->id,
        ])
        ->assertOk();

    $conversation->refresh();

    expect($conversation->status)->toBe(Conversation::STATUS_OPEN)
        ->and($conversation->assignee_id)->toBe($agent->id)
        ->and($conversation->assignee_agent_bot_id)->toBeNull();
});

it('gán bot cho hội thoại đưa hội thoại về pending', function () {
    [$account, $inbox, $bot] = botInboxFixtures(activeBot: false);
    $admin = botInboxAgent($account, $inbox, AccountUser::ROLE_ADMINISTRATOR);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'assignee_id' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/assignments", [
            'assignee_id' => $bot->id,
            'assignee_type' => 'AgentBot',
        ])
        ->assertOk()
        ->assertJsonPath('id', $bot->id)
        ->assertJsonPath('bot_type', 'webhook');

    $conversation->refresh();

    expect($conversation->status)->toBe(Conversation::STATUS_PENDING)
        ->and($conversation->assignee_id)->toBeNull()
        ->and($conversation->assignee_agent_bot_id)->toBe($bot->id);
});

it('cho bot tạo hội thoại trong inbox mà bot không phải thành viên', function () {
    [$account, $inbox, $bot] = botInboxFixtures();
    $contact = Contact::factory()->create(['account_id' => $account->id]);

    $this->withHeader('api_access_token', $bot->accessToken->token)
        ->postJson("/api/v1/accounts/{$account->id}/conversations", [
            'inbox_id' => $inbox->id,
            'contact_id' => $contact->id,
            'source_id' => 'bot-source-1',
        ])
        ->assertOk();
});

it('cho bot bật trạng thái đang gõ', function () {
    [$account, $inbox, $bot] = botInboxFixtures();
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    $this->withHeader('api_access_token', $bot->accessToken->token)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", [
            'typing_status' => 'on',
        ])
        ->assertOk();
});
