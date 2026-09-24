<?php

use App\Models\Account;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Search\Drivers\MeilisearchEngine;
use App\Search\Drivers\PostgresSearchEngine;
use App\Search\SearchEngine;
use App\Search\SearchQuery;
use App\Search\SearchTarget;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Meilisearch\Client;
use Meilisearch\Contracts\TasksQuery;
use Meilisearch\Endpoints\Keys;

// Chạy với Meilisearch thật (MEILISEARCH_HOST + MEILISEARCH_KEY là master key);
// không có máy chủ thì cả nhóm tự bỏ qua. Mỗi lượt dùng tiền tố chỉ mục riêng.
function meilisearchAdmin(): Client
{
    return new Client((string) config('search.meilisearch.host'), (string) config('search.meilisearch.key'));
}

/** @return list<string> */
function meilisearchTestIndexes(): array
{
    return array_map(fn (SearchTarget $target) => app(MeilisearchEngine::class)->indexName($target), SearchTarget::cases());
}

function waitForMeilisearchTasks(): void
{
    $pending = meilisearchAdmin()->getTasks((new TasksQuery)
        ->setIndexUids(meilisearchTestIndexes())
        ->setStatuses(['enqueued', 'processing'])
        ->setLimit(1000));

    meilisearchAdmin()->waitForTasks(array_column($pending->getResults(), 'uid'), 30_000);
}

/** @param  list<Model>  $models */
function indexInMeilisearch(array $models): void
{
    foreach ($models as $model) {
        app(SearchEngine::class)->index(SearchTarget::forModel($model), [$model->getKey()]);
    }

    waitForMeilisearchTasks();
}

function meilisearchIds(SearchTarget $target, string $keyword, int $accountId, array $overrides = []): array
{
    return app(SearchEngine::class)->search(new SearchQuery(...[
        'target' => $target,
        'accountId' => $accountId,
        'keyword' => $keyword,
        'lookbackStart' => now()->subYear(),
        'perPage' => 50,
        ...$overrides,
    ]))->ids;
}

beforeEach(function () {
    if (blank(env('MEILISEARCH_HOST'))) {
        $this->markTestSkipped('Không có MEILISEARCH_HOST — bỏ qua nhóm test Meilisearch.');
    }

    Queue::fake();
    config([
        'search.driver' => 'meilisearch',
        'search.meilisearch.index_prefix' => 'test_'.Str::lower(Str::random(8)).'_',
    ]);
    config(['search.meilisearch.search_key' => collect(meilisearchAdmin()->getKeys()->getResults())
        ->first(fn (Keys $key) => $key->getActions() === ['search'])
        ->getKey()]);

    app(MeilisearchEngine::class)->syncIndexSettings();

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id, 'name' => 'Chị Hạnh', 'email' => 'hanh@example.test']);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id, 'inbox_id' => $this->inbox->id, 'contact_id' => $this->contact->id,
    ]);
    $this->message = fn (string $content, $createdAt = null, ?Conversation $conversation = null) => Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => ($conversation ?? $this->conversation)->inbox_id,
        'conversation_id' => ($conversation ?? $this->conversation)->id,
        'content' => $content,
        'created_at' => $createdAt ?? now(),
    ]);
});

afterEach(function () {
    if (blank(env('MEILISEARCH_HOST'))) {
        return;
    }

    foreach (meilisearchTestIndexes() as $indexUid) {
        meilisearchAdmin()->deleteIndex($indexUid);
    }
});

// Cụm khớp ở cùng vị trí thì thời gian phá hoà như driver PostgreSQL. Lệch có chủ
// đích: Meilisearch xếp cụm đứng sớm trong tin (wordPosition) trên cụm đứng muộn.
it('bao gia: cụm liền "báo giá" đứng trên tin chỉ có "giao", cùng thứ tự với driver PostgreSQL', function () {
    $phraseOlder = ($this->message)('báo giá tháng 9 cho chị', now()->subDays(3));
    $phraseNewer = ($this->message)('báo giá mới nhất em gửi chị', now()->subDay());
    $phraseLater = ($this->message)('em gửi chị báo giá', now());
    // Đủ "bao" và tiền tố "gia" nhưng không thành cụm — khớp tương đối, xếp dưới.
    $onlyGiao = ($this->message)('bảo hành, giao hàng tận nơi', now());
    // Chỉ khớp từ đầu: matchingStrategy last vẫn trả nhưng đứng cuối cùng.
    $firstWordOnly = ($this->message)('bảo hành 12 tháng', now());
    indexInMeilisearch([$phraseOlder, $phraseNewer, $phraseLater, $onlyGiao, $firstWordOnly]);

    $meilisearch = meilisearchIds(SearchTarget::Messages, 'bao gia', $this->account->id);
    $postgres = app(PostgresSearchEngine::class)->search(new SearchQuery(
        target: SearchTarget::Messages, accountId: $this->account->id, keyword: 'bao gia', lookbackStart: now()->subYear(), perPage: 50,
    ))->ids;
    $samePosition = [$phraseNewer->id, $phraseOlder->id];

    // Hai driver cùng đẩy tin không thành cụm xuống dưới; lệch ở vị trí cụm và ở tin
    // chỉ khớp một từ (tìm tương đối mới có).
    expect($postgres)->toBe([$phraseLater->id, ...$samePosition, $onlyGiao->id])
        ->and($meilisearch)->toBe([...$samePosition, $phraseLater->id, $onlyGiao->id, $firstWordOnly->id]);
});

it('gõ không dấu ra chữ có dấu, kể cả đ: "dong" ↔ "đồng", "da" ↔ "đã"', function () {
    $contract = ($this->message)('hợp đồng đã ký xong');
    $other = ($this->message)('cảm ơn anh');
    indexInMeilisearch([$contract, $other]);

    expect(meilisearchIds(SearchTarget::Messages, 'dong', $this->account->id))->toBe([$contract->id])
        ->and(meilisearchIds(SearchTarget::Messages, 'hop dong da ky', $this->account->id))->toBe([$contract->id])
        ->and(meilisearchIds(SearchTarget::Messages, 'đồng', $this->account->id))->toBe([$contract->id]);
});

it('mọi lượt tìm bị giới hạn trong account và hộp thư được phép', function () {
    $ownMessage = ($this->message)('báo giá');
    $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $otherInboxConversation = Conversation::factory()->create([
        'account_id' => $this->account->id, 'inbox_id' => $otherInbox->id, 'contact_id' => $this->contact->id,
    ]);
    $otherInboxMessage = ($this->message)('báo giá', null, $otherInboxConversation);

    $foreignAccount = Account::factory()->create();
    $foreignInbox = Inbox::factory()->create(['account_id' => $foreignAccount->id, 'enable_auto_assignment' => false]);
    $foreignContact = Contact::factory()->create(['account_id' => $foreignAccount->id, 'name' => 'Chị Hạnh', 'email' => 'hanh2@example.test']);
    $foreignConversation = Conversation::factory()->create([
        'account_id' => $foreignAccount->id, 'inbox_id' => $foreignInbox->id, 'contact_id' => $foreignContact->id,
    ]);
    $foreignMessage = Message::factory()->create([
        'account_id' => $foreignAccount->id, 'inbox_id' => $foreignInbox->id, 'conversation_id' => $foreignConversation->id, 'content' => 'báo giá',
    ]);
    indexInMeilisearch([
        $ownMessage, $otherInboxMessage, $foreignMessage,
        $this->conversation, $otherInboxConversation, $foreignConversation, $this->contact, $foreignContact,
    ]);

    $inboxScope = ['inboxIds' => [$this->inbox->id]];

    expect(meilisearchIds(SearchTarget::Messages, 'bao gia', $this->account->id))->toEqualCanonicalizing([$ownMessage->id, $otherInboxMessage->id])
        ->and(meilisearchIds(SearchTarget::Messages, 'bao gia', $this->account->id, $inboxScope))->toBe([$ownMessage->id])
        ->and(meilisearchIds(SearchTarget::Conversations, 'hanh', $this->account->id, $inboxScope))->toBe([$this->conversation->id])
        ->and(meilisearchIds(SearchTarget::Contacts, 'hanh', $this->account->id))->toBe([$this->contact->id])
        ->and(meilisearchIds(SearchTarget::Messages, 'bao gia', $this->account->id, ['inboxIds' => []]))->toBe([])
        ->and(app(SearchEngine::class)->matchingConversationIds(new SearchQuery(
            target: SearchTarget::Conversations, accountId: $this->account->id, keyword: 'bao gia',
            lookbackStart: now()->subYear(), inboxIds: [$this->inbox->id],
        )))->toBe([$this->conversation->id]);
});

it('xoá hội thoại hay liên hệ gỡ luôn tin và tệp bên dưới khỏi chỉ mục', function () {
    $message = ($this->message)('hợp đồng thuê kho');
    $file = $message->attachments()->save((new Attachment)->forceFill([
        'account_id' => $this->account->id,
        'file_type' => Attachment::FILE_TYPE_FILE,
        'path' => 'attachments/test/'.fake()->uuid(),
        'filename' => 'hop-dong-thue-kho.pdf',
        'content_type' => 'application/pdf',
        'byte_size' => 1024,
    ]));
    $keptContact = Contact::factory()->create(['account_id' => $this->account->id, 'email' => 'giu@example.test']);
    $keptConversation = Conversation::factory()->create([
        'account_id' => $this->account->id, 'inbox_id' => $this->inbox->id, 'contact_id' => $keptContact->id,
    ]);
    $keptMessage = ($this->message)('hợp đồng mua hàng', null, $keptConversation);
    indexInMeilisearch([$message, $file, $this->conversation, $this->contact, $keptMessage, $keptConversation, $keptContact]);

    expect(meilisearchIds(SearchTarget::Files, 'hop dong', $this->account->id))->toBe([$file->id]);

    Contact::query()->whereKey($this->contact->id)->delete();
    app(SearchEngine::class)->remove(SearchTarget::Contacts, [$this->contact->id]);
    waitForMeilisearchTasks();

    expect(meilisearchIds(SearchTarget::Messages, 'hop dong', $this->account->id))->toBe([$keptMessage->id])
        ->and(meilisearchIds(SearchTarget::Files, 'hop dong', $this->account->id))->toBe([])
        ->and(meilisearchIds(SearchTarget::Conversations, (string) $this->conversation->display_id, $this->account->id))->not->toContain($this->conversation->id);
});

it('sửa liên hệ thì hội thoại của liên hệ đó tìm được theo thông tin mới', function () {
    indexInMeilisearch([$this->conversation, $this->contact]);
    expect(meilisearchIds(SearchTarget::Conversations, 'hanh', $this->account->id))->toBe([$this->conversation->id]);

    $this->contact->update(['name' => 'Anh Quốc', 'email' => 'quoc@example.test']);
    indexInMeilisearch([$this->contact]);

    expect(meilisearchIds(SearchTarget::Conversations, 'quoc', $this->account->id))->toBe([$this->conversation->id])
        ->and(meilisearchIds(SearchTarget::Conversations, 'hanh', $this->account->id))->toBe([]);
});

it('đồng bộ id không còn trong PostgreSQL thì gỡ khỏi chỉ mục', function () {
    $message = ($this->message)('đơn hàng số 12');
    indexInMeilisearch([$message]);
    expect(meilisearchIds(SearchTarget::Messages, 'don hang', $this->account->id))->toBe([$message->id]);

    Message::query()->whereKey($message->id)->delete();
    indexInMeilisearch([$message]);

    expect(meilisearchIds(SearchTarget::Messages, 'don hang', $this->account->id))->toBe([]);
});
