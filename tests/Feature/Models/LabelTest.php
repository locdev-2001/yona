<?php

use App\Jobs\Labels\UpdateJob;
use App\Models\Account;
use App\Models\Label;
use Illuminate\Support\Facades\Queue;

// Port từ spec/models/label_spec.rb. Các case validate title và uniqueness nằm ở
// LabelsControllerTest vì validation ở tầng nhận input như các model khác.

it('preserves display case and trims surrounding whitespace', function () {
    $label = Label::factory()->create(['title' => 'Hello_World']);

    expect($label->title)->toBe('Hello_World');

    $label->update(['title' => '  Khách VIP  ']);

    expect($label->fresh()->title)->toBe('Khách VIP');
});

it('keeps foreign characters intact', function () {
    $label = Label::factory()->create(['title' => '学中文_12']);

    expect($label->title)->toBe('学中文_12');
});

it('orders labels by title', function () {
    $account = Account::factory()->create();
    Label::factory()->create(['account_id' => $account->id, 'title' => 'zebra']);
    Label::factory()->create(['account_id' => $account->id, 'title' => 'alpha']);
    Label::factory()->create(['account_id' => $account->id, 'title' => 'monkey']);

    expect(Label::query()->where('account_id', $account->id)->pluck('title')->all())
        ->toBe(['alpha', 'monkey', 'zebra']);
});

it('calls the update job when the title changes', function () {
    $label = Label::factory()->create();
    Queue::fake();

    $label->update(['title' => 'new-title']);

    Queue::assertPushed(UpdateJob::class, fn (UpdateJob $job) => $job->newLabelTitle === 'new-title'
        && $job->accountId === $label->account_id
        && $job->queue === 'default');
});

it('does not call the update job when the title is untouched', function () {
    $label = Label::factory()->create();
    Queue::fake();

    $label->update(['description' => 'new-description']);

    Queue::assertNotPushed(UpdateJob::class);
});
