<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

// Port từ phần #update_labels + cached_label_list_array của
// spec/models/conversation_spec.rb và spec/models/concerns/labelable.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
    $this->agent = User::factory()->create(['name' => 'Agent Smith']);
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->actingAs($this->agent);
});

function labelTitled(Account $account, string $title): Label
{
    return Label::factory()->create(['account_id' => $account->id, 'title' => $title]);
}

function labelActivityContents(Conversation $conversation): array
{
    return $conversation->messages()
        ->where('message_type', Message::TYPE_ACTIVITY)
        ->reorder('id')
        ->pluck('content')
        ->all();
}

it('adds one label to the conversation', function () {
    labelTitled($this->account, 'billing');
    Queue::fake();

    expect($this->conversation->updateLabels(['billing']))->toBeTrue()
        ->and($this->conversation->labelList())->toBe(['billing']);

    Queue::assertPushed(ActivityMessageJob::class, fn (ActivityMessageJob $job) => $job->messageParams === [
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_ACTIVITY,
        'content' => 'Agent Smith added billing',
    ]);
});

it('adds and removes previously added labels', function () {
    foreach (['first', 'second', 'third', 'fourth'] as $title) {
        labelTitled($this->account, $title);
    }

    $this->conversation->updateLabels(['first', 'fourth']);
    expect($this->conversation->labelList())->toBe(['first', 'fourth']);

    expect($this->conversation->updateLabels(['second', 'third']))->toBeTrue()
        ->and($this->conversation->labelList())->toBe(['second', 'third']);

    expect(labelActivityContents($this->conversation))->toBe([
        'Agent Smith added first, fourth',
        'Agent Smith added second, third',
        'Agent Smith removed first, fourth',
    ]);
});

it('keeps cached_label_list in sync with the label list', function () {
    foreach (['customer-support', 'enterprise', 'paid-customer'] as $title) {
        labelTitled($this->account, $title);
    }

    $this->conversation->updateLabels(['customer-support', 'enterprise', 'paid-customer']);

    expect($this->conversation->fresh()->cached_label_list)->toBe('customer-support, enterprise, paid-customer')
        ->and($this->conversation->cachedLabelListArray())->toBe(['customer-support', 'enterprise', 'paid-customer']);

    $this->conversation->updateLabels(['enterprise']);

    expect($this->conversation->fresh()->cached_label_list)->toBe('enterprise');
});

it('sends the conversation updated event with the label change', function () {
    labelTitled($this->account, 'billing');
    Event::fake([DomainEvent::class]);

    $this->conversation->updateLabels(['billing']);

    Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UPDATED
        && $event->data['changed_attributes']['label_list'] === [[], ['billing']]);
});

it('does not touch the conversation when the label list is unchanged', function () {
    labelTitled($this->account, 'billing');
    $this->conversation->updateLabels(['billing']);
    $updatedAt = $this->conversation->fresh()->updated_at;
    Event::fake([DomainEvent::class]);

    $this->conversation->updateLabels(['billing']);

    Event::assertNotDispatched(DomainEvent::class);
    expect($this->conversation->fresh()->updated_at->equalTo($updatedAt))->toBeTrue();
});

it('ignores titles that are not labels of the account', function () {
    labelTitled($this->account, 'billing');
    labelTitled(Account::factory()->create(), 'other-account');

    $this->conversation->updateLabels(['billing', 'unknown', 'other-account']);

    expect($this->conversation->labelList())->toBe(['billing']);
});

it('matches label titles regardless of case and accepts a comma separated string', function () {
    labelTitled($this->account, 'billing');
    labelTitled($this->account, 'vip');

    $this->conversation->updateLabels('Billing, VIP');

    expect($this->conversation->labelList())->toBe(['billing', 'vip']);
});

it('appends labels with add_labels and drops them with remove_labels', function () {
    labelTitled($this->account, 'billing');
    labelTitled($this->account, 'vip');

    $this->conversation->addLabels(['billing']);
    $this->conversation->addLabels(['vip']);
    expect($this->conversation->labelList())->toBe(['billing', 'vip']);

    expect($this->conversation->addLabels([]))->toBeFalse();

    $this->conversation->removeLabels(['billing']);
    expect($this->conversation->labelList())->toBe(['vip'])
        ->and($this->conversation->fresh()->cached_label_list)->toBe('vip');
});

it('labels a contact without touching the contact record', function () {
    $contact = Contact::factory()->create(['account_id' => $this->account->id]);
    labelTitled($this->account, 'vip');
    $updatedAt = $contact->updated_at;

    $contact->updateLabels(['vip']);

    expect($contact->labelList())->toBe(['vip'])
        ->and($contact->fresh()->updated_at->equalTo($updatedAt))->toBeTrue();
});

it('drops taggings when the label is deleted', function () {
    $label = labelTitled($this->account, 'billing');
    $this->conversation->updateLabels(['billing']);

    $label->delete();

    expect($this->conversation->labelList())->toBe([]);
});
