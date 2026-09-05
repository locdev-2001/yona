<?php

use App\Events\DomainEvent;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Label;
use App\Services\Labels\DestroyService;
use Illuminate\Support\Facades\Event;

// Port từ spec/services/labels/destroy_service_spec.rb. Bỏ các case gắn với
// label_deleted_at: taggings có khóa ngoại cascade nên không thể tồn tại liên
// kết tạo sau khi nhãn bị xóa. Bỏ case invalidate filtered unread count (B8).

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->label = Label::factory()->create(['account_id' => $this->account->id, 'title' => 'support']);
    Label::factory()->create(['account_id' => $this->account->id, 'title' => 'billing']);
    Label::factory()->create(['account_id' => $this->account->id, 'title' => 'vip']);

    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id]);

    $this->conversation->updateLabels(['support', 'billing']);
    $this->contact->updateLabels(['support', 'vip']);
});

it('removes the label from associated conversations and contacts', function () {
    $this->label->delete();

    (new DestroyService('support', $this->account->id))->perform();

    expect($this->conversation->labelList())->toBe(['billing'])
        ->and($this->conversation->fresh()->cached_label_list)->toBe('billing')
        ->and($this->contact->labelList())->toBe(['vip']);
});

it('does not remove labels from other accounts', function () {
    $otherAccount = Account::factory()->create();
    Label::factory()->create(['account_id' => $otherAccount->id, 'title' => 'support']);
    $otherConversation = Conversation::factory()->create(['account_id' => $otherAccount->id]);
    $otherConversation->updateLabels(['support']);

    $this->label->delete();
    (new DestroyService('support', $this->account->id))->perform();

    expect($otherConversation->labelList())->toBe(['support'])
        ->and($otherConversation->fresh()->cached_label_list)->toBe('support');
});

it('does not dispatch conversation or contact update events', function () {
    $this->label->delete();
    Event::fake([DomainEvent::class]);

    (new DestroyService('support', $this->account->id))->perform();

    Event::assertNotDispatched(DomainEvent::class);
});

it('leaves the conversation untouched when no cached label matches', function () {
    $updatedAt = $this->conversation->fresh()->updated_at;

    (new DestroyService('unknown', $this->account->id))->perform();

    expect($this->conversation->fresh()->updated_at->equalTo($updatedAt))->toBeTrue()
        ->and($this->conversation->fresh()->cached_label_list)->toBe('support, billing');
});
