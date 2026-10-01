<?php

use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Services\Channels\IncomingConversationResolver;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Sleep;

function incomingResolverContactInbox(): ContactInbox
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);

    return ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
}

function conversationCountFor(ContactInbox $contactInbox): int
{
    return Conversation::query()->where('contact_inbox_id', $contactInbox->id)->count();
}

beforeEach(fn () => Sleep::fake(syncWithCarbon: true));

it('reuses the open conversation and opens a new one once the previous is resolved', function () {
    $contactInbox = incomingResolverContactInbox();

    $first = IncomingConversationResolver::resolve($contactInbox);
    expect(IncomingConversationResolver::resolve($contactInbox)->id)->toBe($first->id);

    $first->update(['status' => Conversation::STATUS_RESOLVED]);

    expect(IncomingConversationResolver::resolve($contactInbox)->id)->not->toBe($first->id)
        ->and(conversationCountFor($contactInbox))->toBe(2);
});

it('lets a worker racing between lookup and create wait and then reuse the same conversation', function () {
    $contactInbox = incomingResolverContactInbox();
    $racingWorkerResult = null;
    $racingWorkerHadToWait = false;
    $raceTriggered = false;

    DB::listen(function (QueryExecuted $query) use ($contactInbox, &$racingWorkerResult, &$racingWorkerHadToWait, &$raceTriggered) {
        if ($raceTriggered || ! str_contains($query->sql, 'from "conversations"')) {
            return;
        }

        $raceTriggered = true;

        try {
            $racingWorkerResult = IncomingConversationResolver::resolve(ContactInbox::query()->findOrFail($contactInbox->id));
        } catch (LockTimeoutException) {
            $racingWorkerHadToWait = true;
        }
    });

    $conversation = IncomingConversationResolver::resolve($contactInbox);
    $racingWorkerResult ??= IncomingConversationResolver::resolve(ContactInbox::query()->findOrFail($contactInbox->id));

    expect(conversationCountFor($contactInbox))->toBe(1)
        ->and($racingWorkerResult->id)->toBe($conversation->id)
        ->and($raceTriggered)->toBeTrue()
        ->and($racingWorkerHadToWait)->toBeTrue();
});

it('holds the contact inbox lock until the surrounding transaction commits', function () {
    $contactInbox = incomingResolverContactInbox();

    $conversation = DB::transaction(function () use ($contactInbox) {
        $created = IncomingConversationResolver::resolve($contactInbox);

        expect(fn () => IncomingConversationResolver::resolve($contactInbox))->toThrow(LockTimeoutException::class);

        return $created;
    });

    expect(IncomingConversationResolver::resolve($contactInbox)->id)->toBe($conversation->id)
        ->and(conversationCountFor($contactInbox))->toBe(1);
});

it('releases the contact inbox lock when the surrounding transaction rolls back', function () {
    $contactInbox = incomingResolverContactInbox();

    try {
        DB::transaction(function () use ($contactInbox) {
            IncomingConversationResolver::resolve($contactInbox);

            throw new RuntimeException('message persistence failed');
        });
    } catch (RuntimeException) {
    }

    expect(conversationCountFor($contactInbox))->toBe(0)
        ->and(IncomingConversationResolver::resolve($contactInbox))->toBeInstanceOf(Conversation::class)
        ->and(conversationCountFor($contactInbox))->toBe(1);
});
