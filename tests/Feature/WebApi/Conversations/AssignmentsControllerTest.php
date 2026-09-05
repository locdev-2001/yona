<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use App\Support\OnlineStatusTracker;
use Illuminate\Support\Facades\Redis;

// Port từ spec/controllers/api/v1/accounts/conversations/assignments_controller_spec.rb.
// Bỏ các case AgentBot (chưa port).

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $this->inbox->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->inboxMembers()->create(['user_id' => $this->agent->id]);
});

function assignmentsUrl(Account $account, Conversation $conversation): string
{
    return "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/assignments";
}

it('returns unauthorized for guests', function () {
    $this->postJson(assignmentsUrl($this->account, $this->conversation))->assertUnauthorized();
});

it('returns unauthorized for a user without access to the inbox', function () {
    $outsider = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id]);

    $this->actingAs($outsider)
        ->postJson(assignmentsUrl($this->account, $this->conversation), ['assignee_id' => $this->agent->id])
        ->assertUnauthorized();
});

it('assigns an agent and returns the agent payload', function () {
    $response = $this->actingAs($this->agent)
        ->postJson(assignmentsUrl($this->account, $this->conversation), ['assignee_id' => $this->agent->id])
        ->assertOk();

    expect($this->conversation->refresh()->assignee_id)->toBe($this->agent->id)
        ->and($response->json('id'))->toBe($this->agent->id)
        ->and($response->json('account_id'))->toBe($this->account->id)
        ->and($response->json('name'))->toBe($this->agent->name)
        ->and($response->json('role'))->toBe('agent');
});

it('unassigns the agent and returns null', function () {
    $this->conversation->update(['assignee_id' => $this->agent->id]);

    $response = $this->actingAs($this->agent)
        ->postJson(assignmentsUrl($this->account, $this->conversation), ['assignee_id' => null])
        ->assertOk();

    expect($this->conversation->refresh()->assignee_id)->toBeNull()
        ->and($response->getContent())->toBe('null')
        ->and($this->conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->reorder('id', 'desc')->first()->content)
        ->toBe("Conversation unassigned by {$this->agent->name}");
});

it('writes a self-assigned activity when the agent takes the conversation', function () {
    $this->actingAs($this->agent)
        ->postJson(assignmentsUrl($this->account, $this->conversation), ['assignee_id' => $this->agent->id])
        ->assertOk();

    expect($this->conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->reorder('id', 'desc')->first()->content)
        ->toBe("{$this->agent->name} self-assigned this conversation");
});

it('assigns a team and pulls the assignee from it', function () {
    $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => true]);
    $teamMember = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $teamMember->id]);
    $this->inbox->inboxMembers()->create(['user_id' => $teamMember->id]);
    $team->addMembers([$teamMember->id]);
    OnlineStatusTracker::updatePresence($this->account->id, 'User', $teamMember->id);
    OnlineStatusTracker::setStatus($this->account->id, $teamMember->id, 'online');

    $response = $this->actingAs($this->agent)
        ->postJson(assignmentsUrl($this->account, $this->conversation), ['team_id' => $team->id])
        ->assertOk();

    expect($this->conversation->refresh()->team_id)->toBe($team->id)
        ->and($this->conversation->assignee_id)->toBe($teamMember->id)
        ->and($response->json('id'))->toBe($team->id)
        ->and($response->json('name'))->toBe($team->name)
        ->and($this->conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->reorder('id', 'desc')->first()->content)
        ->toBe("Assigned to {$teamMember->name} via {$team->name} by {$this->agent->name}");
});

it('removes the team when team_id is zero', function () {
    $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => false]);
    $this->conversation->update(['team_id' => $team->id]);

    $response = $this->actingAs($this->agent)
        ->postJson(assignmentsUrl($this->account, $this->conversation), ['team_id' => 0])
        ->assertOk();

    expect($this->conversation->refresh()->team_id)->toBeNull()
        ->and($response->getContent())->toBe('null')
        ->and($this->conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->reorder('id', 'desc')->first()->content)
        ->toBe("Unassigned from {$team->name} by {$this->agent->name}");
});

it('drops an assignee who is not part of the assigned team', function () {
    $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => false]);
    $this->conversation->update(['assignee_id' => $this->agent->id]);

    $this->actingAs($this->agent)
        ->postJson(assignmentsUrl($this->account, $this->conversation), ['team_id' => $team->id])
        ->assertOk();

    expect($this->conversation->refresh()->assignee_id)->toBeNull();
});

// `render json: nil` của bản gốc trả đúng chữ `null` (không phải `{}`).
it('returns a null body when neither assignee_id nor team_id is given', function () {
    $response = $this->actingAs($this->agent)->postJson(assignmentsUrl($this->account, $this->conversation))->assertOk();

    expect($response->getContent())->toBe('null')
        ->and($this->conversation->refresh()->assignee_id)->toBeNull();
});
