<?php

use App\Jobs\Contacts\BulkActionJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Label;
use App\Models\User;
use App\Services\Contacts\BulkActionService;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

// Port từ spec/services/contacts/bulk_action_service_spec.rb (+ ba service con)
// và nhánh Contact của bulk_actions_controller_spec.rb.

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->contacts = collect(range(1, 3))->map(fn () => Contact::factory()->create([
        'account_id' => $this->account->id,
    ]));
    Label::factory()->create(['account_id' => $this->account->id, 'title' => 'vip']);
    $this->url = "/api/v1/accounts/{$this->account->id}/bulk_actions";
});

it('assigns labels to the selected contacts', function () {
    (new BulkActionService($this->account, $this->admin, [
        'ids' => $this->contacts->pluck('id')->all(),
        'labels' => ['add' => ['vip', '']],
    ]))->perform();

    $this->contacts->each(fn (Contact $contact) => expect($contact->fresh()->labelList())->toBe(['vip']));
});

it('removes labels from the selected contacts', function () {
    $this->contacts->each(fn (Contact $contact) => $contact->addLabels(['vip']));

    (new BulkActionService($this->account, $this->admin, [
        'ids' => $this->contacts->pluck('id')->all(),
        'labels' => ['remove' => ['vip']],
    ]))->perform();

    $this->contacts->each(fn (Contact $contact) => expect($contact->fresh()->labelList())->toBe([]));
});

it('deletes the selected contacts only', function () {
    $kept = $this->contacts->last();

    (new BulkActionService($this->account, $this->admin, [
        'ids' => $this->contacts->take(2)->pluck('id')->all(),
        'action_name' => 'delete',
    ]))->perform();

    expect(Contact::whereKey($this->contacts->take(2)->pluck('id'))->count())->toBe(0)
        ->and(Contact::whereKey($kept->id)->exists())->toBeTrue();
});

it('never touches contacts of another account', function () {
    $otherContact = Contact::factory()->create(['account_id' => Account::factory()->create()->id]);

    (new BulkActionService($this->account, $this->admin, [
        'ids' => [$otherContact->id],
        'action_name' => 'delete',
    ]))->perform();

    expect(Contact::whereKey($otherContact->id)->exists())->toBeTrue();
});

it('reports an unknown operation when there is nothing to do', function () {
    $result = (new BulkActionService($this->account, $this->admin, [
        'ids' => $this->contacts->pluck('id')->all(),
    ]))->perform();

    expect($result)->toBe(['success' => false, 'error' => 'unknown_operation']);
});

it('queues the contact job from the controller', function () {
    Queue::fake();

    $this->actingAs($this->agent)->postJson($this->url, [
        'type' => 'Contact',
        'ids' => $this->contacts->pluck('id')->all(),
        'labels' => ['add' => ['vip']],
    ])->assertOk();

    Queue::assertPushed(BulkActionJob::class, function (BulkActionJob $job) {
        return $job->account->id === $this->account->id
            && $job->params['ids'] === $this->contacts->pluck('id')->all()
            && $job->params['labels'] === ['add' => ['vip'], 'remove' => []];
    });
});

it('lets only administrators delete contacts in bulk', function () {
    Queue::fake();

    $this->actingAs($this->agent)->postJson($this->url, [
        'type' => 'Contact',
        'ids' => $this->contacts->pluck('id')->all(),
        'action_name' => 'delete',
    ])->assertUnauthorized();

    $this->actingAs($this->admin)->postJson($this->url, [
        'type' => 'Contact',
        'ids' => $this->contacts->pluck('id')->all(),
        'action_name' => 'delete',
    ])->assertOk();

    Queue::assertPushed(BulkActionJob::class);
});
