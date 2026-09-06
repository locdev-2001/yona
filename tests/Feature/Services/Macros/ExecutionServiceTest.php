<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\Macro;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use App\Services\Macros\ExecutionService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
    $this->user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->user->id]);
    $this->conversation->inbox->members()->attach($this->user->id);

    $this->macro = Macro::factory()->create([
        'account_id' => $this->account->id,
        'created_by_id' => $this->user->id,
        'updated_by_id' => $this->user->id,
    ]);
});

function d3Execute(array $actions): void
{
    test()->macro->update(['actions' => $actions]);

    (new ExecutionService(test()->macro->fresh(), test()->conversation->fresh(), test()->user))->perform();
}

it('assigns the acting user for the self agent id', function () {
    d3Execute([['action_name' => 'assign_agent', 'action_params' => ['self']]]);

    expect($this->conversation->fresh()->assignee_id)->toBe($this->user->id);

    d3Execute([['action_name' => 'assign_agent', 'action_params' => ['nil']]]);

    expect($this->conversation->fresh()->assignee_id)->toBeNull();
});

it('assigns another agent through the shared executor', function () {
    $otherUser = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $otherUser->id]);
    $this->conversation->inbox->members()->attach($otherUser->id);

    d3Execute([['action_name' => 'assign_agent', 'action_params' => [$otherUser->id]]]);

    expect($this->conversation->fresh()->assignee_id)->toBe($otherUser->id);
});

it('sends messages and private notes with the acting user as sender', function () {
    d3Execute([
        ['action_name' => 'send_message', 'action_params' => ['Send this message.']],
        ['action_name' => 'add_private_note', 'action_params' => ['Internal note.']],
    ]);

    $messages = $this->conversation->fresh()->messages()->orderBy('id')->get();

    expect($messages)->toHaveCount(2)
        ->and($messages[0]->content)->toBe('Send this message.')
        ->and($messages[0]->private)->toBeFalse()
        ->and($messages[0]->sender_id)->toBe($this->user->id)
        ->and($messages[0]->sender_type)->toBe('User')
        ->and($messages[1]->content)->toBe('Internal note.')
        ->and($messages[1]->private)->toBeTrue()
        ->and($messages[1]->sender_id)->toBe($this->user->id);
});

it('skips message actions on a tweet conversation', function () {
    $this->conversation->update(['additional_attributes' => ['type' => 'tweet']]);

    d3Execute([
        ['action_name' => 'send_message', 'action_params' => ['Send this message.']],
        ['action_name' => 'add_private_note', 'action_params' => ['Internal note.']],
    ]);

    expect(Message::query()->where('conversation_id', $this->conversation->id)->count())->toBe(0);
});

it('sends the macro own files as an attachment message', function () {
    Storage::fake('public');
    $file = $this->macro->files()->create(
        Attachment::storeUpload(UploadedFile::fake()->image('avatar.png'), $this->account->id)
    );

    d3Execute([['action_name' => 'send_attachment', 'action_params' => [$file->id]]]);

    $message = $this->conversation->fresh()->messages()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->attachments)->toHaveCount(1)
        ->and($message->attachments->first()->filename)->toBe('avatar.png')
        ->and($message->sender_id)->toBe($this->user->id);
});

it('ignores send_attachment when the macro has no matching file', function () {
    d3Execute([['action_name' => 'send_attachment', 'action_params' => [999999]]]);

    expect(Message::query()->where('conversation_id', $this->conversation->id)->count())->toBe(0);
});

it('runs the remaining actions when one of them fails', function () {
    $team = Team::factory()->create(['account_id' => $this->account->id]);

    d3Execute([
        ['action_name' => 'send_email_transcript', 'action_params' => ['someone@example.com']],
        ['action_name' => 'assign_team', 'action_params' => [$team->id]],
        ['action_name' => 'snooze_conversation'],
    ]);

    expect($this->conversation->fresh()->team_id)->toBe($team->id)
        ->and($this->conversation->fresh()->status)->toBe(Conversation::STATUS_SNOOZED);
});

it('applies labels, priority and status changes', function () {
    Label::factory()->create(['account_id' => $this->account->id, 'title' => 'support']);
    Label::factory()->create(['account_id' => $this->account->id, 'title' => 'priority_customer']);

    d3Execute([
        ['action_name' => 'add_label', 'action_params' => ['support', 'priority_customer']],
        ['action_name' => 'change_priority', 'action_params' => ['urgent']],
        ['action_name' => 'change_status', 'action_params' => ['pending']],
    ]);

    expect($this->conversation->fresh()->labelList())->toEqualCanonicalizing(['support', 'priority_customer'])
        ->and($this->conversation->fresh()->status)->toBe(Conversation::STATUS_PENDING);

    d3Execute([['action_name' => 'remove_label', 'action_params' => ['support']]]);

    expect($this->conversation->fresh()->labelList())->toEqualCanonicalizing(['priority_customer']);
});

it('names the acting user in the activity messages it creates', function () {
    Label::factory()->create(['account_id' => $this->account->id, 'title' => 'sales']);

    d3Execute([
        ['action_name' => 'add_label', 'action_params' => ['sales']],
        ['action_name' => 'resolve_conversation'],
    ]);

    $activities = $this->conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->pluck('content');

    expect($activities)->toContain("{$this->user->name} added sales")
        ->and($activities)->toContain("Conversation was marked resolved by {$this->user->name}");
});

it('restores the previous auth user after the run', function () {
    $otherUser = User::factory()->create();
    $this->actingAs($otherUser);

    d3Execute([['action_name' => 'resolve_conversation']]);

    expect(auth()->id())->toBe($otherUser->id);
});

it('names the acting user in every activity an action can create', function () {
    Label::factory()->create(['account_id' => $this->account->id, 'title' => 'd3probe']);

    d3Execute([
        ['action_name' => 'assign_agent', 'action_params' => ['self']],
        ['action_name' => 'add_label', 'action_params' => ['d3probe']],
        ['action_name' => 'change_priority', 'action_params' => ['urgent']],
        ['action_name' => 'remove_label', 'action_params' => ['d3probe']],
        ['action_name' => 'snooze_conversation'],
        ['action_name' => 'mute_conversation'],
        ['action_name' => 'resolve_conversation'],
    ]);

    $name = $this->user->name;
    $activities = $this->conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->pluck('content');

    expect($activities)->toContain("{$name} self-assigned this conversation")
        ->and($activities)->toContain("{$name} added d3probe")
        ->and($activities)->toContain("{$name} set the priority to urgent")
        ->and($activities)->toContain("{$name} removed d3probe")
        ->and($activities)->toContain("Conversation was snoozed by {$name}")
        ->and($activities)->toContain("Conversation was marked resolved by {$name}")
        ->and($activities)->toContain("{$name} has muted the conversation");
});
