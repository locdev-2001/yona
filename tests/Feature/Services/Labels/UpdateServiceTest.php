<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Jobs\Labels\UpdateJob;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Label;
use App\Services\Labels\UpdateService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

// Port từ spec/services/labels/update_service_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->label = Label::factory()->create(['account_id' => $this->account->id, 'title' => 'old-title']);
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id]);

    $this->conversation->updateLabels(['old-title']);
    $this->contact->updateLabels(['old-title']);

    // Đổi tên nhãn trong hàng đợi giả để service được gọi tay trong từng case.
    Queue::fake();
    $this->label->update(['title' => 'updated-label-title']);
    Queue::assertPushed(UpdateJob::class);
});

it('renames the label on every associated conversation and contact', function () {
    (new UpdateService('updated-label-title', $this->account->id))->perform();

    expect($this->conversation->labelList())->toBe(['updated-label-title'])
        ->and($this->conversation->fresh()->cached_label_list)->toBe('updated-label-title')
        ->and($this->contact->labelList())->toBe(['updated-label-title']);
});

it('sends a conversation updated event for every refreshed conversation', function () {
    Event::fake([DomainEvent::class]);

    (new UpdateService('updated-label-title', $this->account->id))->perform();

    Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UPDATED
        && $event->data['changed_attributes']['label_list'] === [['old-title'], ['updated-label-title']]);
});

it('does not create an activity message when no user performed the rename', function () {
    (new UpdateService('updated-label-title', $this->account->id))->perform();

    Queue::assertNotPushed(ActivityMessageJob::class);
});

it('does nothing when the label no longer exists', function () {
    (new UpdateService('missing-title', $this->account->id))->perform();

    expect($this->conversation->fresh()->cached_label_list)->toBe('old-title');
});
