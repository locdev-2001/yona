<?php

use App\Jobs\WebhookJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\CannedResponse;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\Macro;
use App\Models\Message;
use App\Models\PaymentAccount;
use App\Models\Team;
use App\Models\User;
use App\Services\Macros\ExecutionService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
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

function d3LastMessage(): Message
{
    return Message::query()->where('conversation_id', test()->conversation->id)->orderByDesc('id')->firstOrFail();
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

it('sends a copy of the macro file so recalling or deleting the message keeps the macro file', function () {
    Storage::fake('public');
    $file = $this->macro->files()->create(
        Attachment::storeUpload(UploadedFile::fake()->create('bang-gia.pdf', 12, 'application/pdf'), $this->account->id)
    );
    $sendFile = [['action_name' => 'send_attachment', 'action_params' => [$file->id]]];

    d3Execute($sendFile);
    $recalled = d3LastMessage();
    $recalledPath = $recalled->attachments->first()->path;

    expect($recalledPath)->not->toBe($file->path);

    $recalled->markDeleted();

    Storage::disk('public')->assertMissing($recalledPath);
    Storage::disk('public')->assertExists($file->path);

    d3Execute($sendFile);
    $deleted = d3LastMessage();

    expect($deleted->id)->not->toBe($recalled->id)
        ->and($deleted->attachments)->toHaveCount(1)
        ->and($deleted->attachments->first()->filename)->toBe('bang-gia.pdf');
    Storage::disk('public')->assertExists($deleted->attachments->first()->path);

    $deleted->delete();

    Storage::disk('public')->assertExists($file->path);

    d3Execute($sendFile);

    expect(d3LastMessage()->id)->toBeGreaterThan($deleted->id)
        ->and(d3LastMessage()->attachments)->toHaveCount(1);
});

it('skips a macro file missing on disk and still sends the rest', function () {
    Storage::fake('public');
    Log::spy();
    $team = Team::factory()->create(['account_id' => $this->account->id]);
    $lost = $this->macro->files()->create(
        Attachment::storeUpload(UploadedFile::fake()->create('mat.pdf', 4, 'application/pdf'), $this->account->id)
    );
    $kept = $this->macro->files()->create(
        Attachment::storeUpload(UploadedFile::fake()->image('con.png'), $this->account->id)
    );
    Storage::disk('public')->delete($lost->path);

    d3Execute([
        ['action_name' => 'send_attachment', 'action_params' => [$lost->id]],
        ['action_name' => 'send_attachment', 'action_params' => [$kept->id]],
        ['action_name' => 'assign_team', 'action_params' => [$team->id]],
    ]);

    $withFiles = Message::query()->where('conversation_id', $this->conversation->id)->has('attachments')->with('attachments')->get();

    expect($withFiles)->toHaveCount(1)
        ->and($withFiles->first()->attachments->pluck('filename')->all())->toBe(['con.png'])
        ->and($this->conversation->fresh()->team_id)->toBe($team->id);
    Log::shouldHaveReceived('warning')->with('macro.attachment.missing_file', Mockery::on(
        fn (array $context) => $context['attachment_id'] === $lost->id
    ))->once();
});

it('leaves no copied file behind when no attachment message is sent', function () {
    Storage::fake('public');
    $this->conversation->update(['additional_attributes' => ['type' => 'tweet']]);
    $file = $this->macro->files()->create(
        Attachment::storeUpload(UploadedFile::fake()->image('avatar.png'), $this->account->id)
    );

    d3Execute([['action_name' => 'send_attachment', 'action_params' => [$file->id]]]);

    expect(Message::query()->where('conversation_id', $this->conversation->id)->count())->toBe(0)
        ->and(Storage::disk('public')->allFiles())->toBe([$file->path]);
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

it('dispatches the webhook job with the conversation payload for send_webhook_event', function () {
    Queue::fake();

    Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'content' => 'Latest chat message.',
    ]);

    d3Execute([['action_name' => 'send_webhook_event', 'action_params' => ['https://hooks.example.com/macro']]]);

    Queue::assertPushed(WebhookJob::class, function (WebhookJob $job) {
        return $job->url === 'https://hooks.example.com/macro'
            && $job->payload['event'] === 'macro.executed'
            && $job->payload['id'] === $this->conversation->display_id
            && $job->payload['account']['id'] === $this->account->id
            && $job->payload['messages'][0]['content'] === 'Latest chat message.';
    });
});

it('skips send_webhook_event without a url', function () {
    Queue::fake();

    d3Execute([['action_name' => 'send_webhook_event', 'action_params' => []]]);

    Queue::assertNotPushed(WebhookJob::class);
});

it('sends the card of a canned response for send_canned_card, rebuilding the bank details', function () {
    $paymentAccount = PaymentAccount::factory()->create([
        'account_id' => $this->account->id,
        'bank_bin' => '970436',
        'account_number' => '1023456789',
        'account_name' => 'HKD GOM MOC',
    ]);
    $canned = CannedResponse::query()->create([
        'account_id' => $this->account->id,
        'short_code' => 'ck-tra-truoc',
        'content_type' => 'bank_transfer',
        'content_attributes' => ['payment_account_id' => $paymentAccount->id, 'amount' => 480000],
    ]);

    d3Execute([['action_name' => 'send_canned_card', 'action_params' => [$canned->id]]]);

    $message = d3LastMessage();
    expect($message->content_type)->toBe(Message::CONTENT_TYPES['bank_transfer'])
        ->and($message->content_attributes['account_number'])->toBe('1023456789')
        ->and($message->sender_id)->toBe($this->user->id)
        ->and($message->private)->toBeFalse();
});

it('ignores send_canned_card for a canned response without a card, or from another account', function () {
    $plain = CannedResponse::query()->create(['account_id' => $this->account->id, 'short_code' => 'chao', 'content' => 'Chào bạn']);
    $foreign = CannedResponse::query()->create([
        'account_id' => Account::factory()->create()->id,
        'short_code' => 'khac-tenant',
        'content_type' => 'input_select',
        'content_attributes' => ['items' => [['title' => 'A', 'value' => 'A']]],
    ]);

    d3Execute([
        ['action_name' => 'send_canned_card', 'action_params' => [$plain->id]],
        ['action_name' => 'send_canned_card', 'action_params' => [$foreign->id]],
    ]);

    expect(Message::query()->where('conversation_id', $this->conversation->id)->count())->toBe(0);
});

it('skips send_canned_card on a tweet conversation', function () {
    $this->conversation->update(['additional_attributes' => ['type' => 'tweet']]);
    $canned = CannedResponse::query()->create([
        'account_id' => $this->account->id,
        'short_code' => 'hoi-gio',
        'content' => 'Bạn muốn nhận hàng khi nào ạ?',
        'content_type' => 'input_select',
        'content_attributes' => ['items' => [['title' => 'Sáng', 'value' => 'Sáng'], ['title' => 'Tối', 'value' => 'Tối']]],
    ]);

    d3Execute([['action_name' => 'send_canned_card', 'action_params' => [$canned->id]]]);

    expect(Message::query()->where('conversation_id', $this->conversation->id)->count())->toBe(0);
});
