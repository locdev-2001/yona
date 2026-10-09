<?php

use App\Actions\ContactMergeAction;
use App\Jobs\Search\ProcessSearchOutboxJob;
use App\Livewire\Pulse\SearchOutboxCard;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Search\Drivers\PostgresSearchEngine;
use App\Search\SearchEngine;
use App\Search\SearchHits;
use App\Search\SearchOutbox;
use App\Search\SearchQuery;
use App\Search\SearchTarget;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Livewire\Livewire;

// Engine giữ chỉ mục riêng, ghi lại mọi lượt index/remove để test đối chiếu.
function syncingSearchEngine(bool $failing = false): object
{
    $engine = new class($failing) implements SearchEngine
    {
        /** @var list<array{string, string, list<int>}> */
        public array $calls = [];

        public function __construct(private readonly bool $failing) {}

        public function search(SearchQuery $query): SearchHits
        {
            return SearchHits::none();
        }

        public function matchingConversationIds(SearchQuery $query): Builder|array
        {
            return [];
        }

        public function conversationIdsMatchingContact(SearchQuery $query): Builder|array
        {
            return [];
        }

        public function latestMatchedMessageIds(SearchQuery $query): Builder|array
        {
            return [];
        }

        public function keepsSeparateIndex(): bool
        {
            return true;
        }

        public function index(SearchTarget $target, array $ids): void
        {
            $this->failIfAsked();
            $this->calls[] = ['index', $target->value, $ids];
        }

        public function remove(SearchTarget $target, array $ids): void
        {
            $this->failIfAsked();
            $this->calls[] = ['remove', $target->value, $ids];
        }

        /** @return list<int> */
        public function indexedIds(SearchTarget $target): array
        {
            return collect($this->calls)
                ->filter(fn (array $call) => $call[0] === 'index' && $call[1] === $target->value)
                ->flatMap(fn (array $call) => $call[2])
                ->sort()->values()->all();
        }

        private function failIfAsked(): void
        {
            if ($this->failing) {
                throw new RuntimeException('engine down');
            }
        }
    };

    app()->instance(SearchEngine::class, $engine);

    return $engine;
}

/** @return list<array{string, int, string}> */
function outboxRows(): array
{
    return DB::table(SearchOutbox::TABLE)->orderBy('id')->get()
        ->map(fn (object $row) => [$row->document_type, (int) $row->document_id, $row->operation])
        ->all();
}

function messageFile(Message $message, string $filename = 'bao-gia.pdf'): Attachment
{
    return $message->attachments()->save((new Attachment)->forceFill([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_FILE,
        'path' => 'attachments/test/'.fake()->uuid(),
        'filename' => $filename,
        'content_type' => 'application/pdf',
        'byte_size' => 1024,
    ]));
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $this->makeConversation = fn (?Contact $contact = null) => Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => ($contact ?? Contact::factory()->create(['account_id' => $this->account->id]))->id,
    ]);
    $this->makeMessage = fn (Conversation $conversation, string $content = 'báo giá') => Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $conversation->id,
        'content' => $content,
    ]);
});

it('không ghi dòng outbox nào khi engine tìm thẳng trong PostgreSQL', function () {
    expect(app(SearchEngine::class))->toBeInstanceOf(PostgresSearchEngine::class);

    $message = ($this->makeMessage)(($this->makeConversation)());
    messageFile($message);
    $message->update(['content' => 'sửa']);
    $message->delete();

    expect(outboxRows())->toBe([]);
});

it('ghi upsert khi tạo, sửa và delete khi xoá cho cả bốn loại tài liệu', function () {
    Queue::fake();
    syncingSearchEngine();

    $contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $conversation = ($this->makeConversation)($contact);
    $message = ($this->makeMessage)($conversation);
    $file = messageFile($message);
    $message->update(['content' => 'đã sửa']);
    $message->delete();

    $rows = collect(outboxRows());

    expect($rows)->toContain(['contacts', $contact->id, 'upsert'])
        ->toContain(['conversations', $conversation->id, 'upsert'])
        ->toContain(['messages', $message->id, 'upsert'])
        ->toContain(['files', $file->id, 'upsert'])
        ->toContain(['files', $file->id, 'delete'])
        ->and($rows->last())->toBe(['messages', $message->id, 'delete'])
        ->and(DB::table(SearchOutbox::TABLE)->distinct()->pluck('account_id')->all())->toBe([$this->account->id]);

    Queue::assertPushedOn('low', ProcessSearchOutboxJob::class);
});

it('bỏ qua tệp không phải đính kèm tin nhắn (ảnh đại diện)', function () {
    Queue::fake();
    syncingSearchEngine();
    $contact = Contact::factory()->create(['account_id' => $this->account->id]);
    DB::table(SearchOutbox::TABLE)->delete();

    $contact->avatar()->save((new Attachment)->forceFill([
        'account_id' => $this->account->id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => 'avatars/test/'.fake()->uuid(),
        'filename' => 'avatar.png',
        'content_type' => 'image/png',
        'byte_size' => 10,
    ]));

    expect(collect(outboxRows())->where(0, 'files')->all())->toBe([]);
});

it('ghi outbox cùng transaction: rollback thì không còn dòng nào', function () {
    Queue::fake();
    syncingSearchEngine();
    $conversation = ($this->makeConversation)();
    DB::table(SearchOutbox::TABLE)->delete();

    expect(fn () => DB::transaction(function () use ($conversation) {
        ($this->makeMessage)($conversation);
        expect(DB::table(SearchOutbox::TABLE)->where('document_type', 'messages')->count())->toBe(1);

        throw new RuntimeException('huỷ');
    }))->toThrow(RuntimeException::class);

    expect(outboxRows())->toBe([])
        ->and(Message::query()->where('conversation_id', $conversation->id)->count())->toBe(0);
});

it('gộp liên hệ ghi đủ hội thoại, tin chuyển chủ và liên hệ bị xoá', function () {
    Queue::fake();
    syncingSearchEngine();
    $base = Contact::factory()->create(['account_id' => $this->account->id]);
    $mergee = Contact::factory()->create(['account_id' => $this->account->id]);
    $conversation = ($this->makeConversation)($mergee);
    $message = Message::factory()->create([
        'account_id' => $this->account->id, 'inbox_id' => $this->inbox->id, 'conversation_id' => $conversation->id,
        'sender_type' => $mergee->getMorphClass(), 'sender_id' => $mergee->id, 'message_type' => 0,
    ]);
    DB::table(SearchOutbox::TABLE)->delete();

    (new ContactMergeAction($this->account, $base, $mergee))->perform();

    expect(collect(outboxRows()))->toContain(['conversations', $conversation->id, 'upsert'])
        ->toContain(['messages', $message->id, 'upsert'])
        ->toContain(['contacts', $mergee->id, 'delete']);
});

it('job xử lý lô: thao tác cuối của mỗi tài liệu thắng, gọi engine rồi xoá dòng', function () {
    Queue::fake();
    $engine = syncingSearchEngine();
    $conversation = ($this->makeConversation)();
    $kept = ($this->makeMessage)($conversation);
    $gone = ($this->makeMessage)($conversation);
    $kept->update(['content' => 'sửa lần một']);
    $kept->update(['content' => 'sửa lần hai']);
    $gone->delete();

    (new ProcessSearchOutboxJob)->handle(app(SearchOutbox::class));

    expect(outboxRows())->toBe([])
        ->and($engine->calls)->toContain(['index', 'messages', [$kept->id]])
        ->toContain(['remove', 'messages', [$gone->id]])
        ->and(collect($engine->calls)->where(1, 'messages')->count())->toBe(2);
});

it('engine lỗi: dòng outbox còn nguyên để thử lại, luồng ghi tin không hỏng', function () {
    syncingSearchEngine(failing: true);
    $conversation = ($this->makeConversation)();

    // Hàng đợi sync: job chạy ngay sau commit và ném lỗi — lượt ghi vẫn thành công.
    $message = ($this->makeMessage)($conversation);

    expect(Message::query()->whereKey($message->id)->exists())->toBeTrue()
        ->and(collect(outboxRows()))->toContain(['messages', $message->id, 'upsert'])
        ->and(fn () => (new ProcessSearchOutboxJob)->handle(app(SearchOutbox::class)))->toThrow(RuntimeException::class)
        ->and(collect(outboxRows()))->toContain(['messages', $message->id, 'upsert']);
});

it('đổi về engine PostgreSQL thì job bỏ các dòng còn tồn', function () {
    Queue::fake();
    syncingSearchEngine();
    ($this->makeMessage)(($this->makeConversation)());
    app()->forgetInstance(SearchEngine::class);

    (new ProcessSearchOutboxJob)->handle(app(SearchOutbox::class));

    expect(outboxRows())->toBe([]);
});

it('search:reindex đưa đúng tập tài liệu của từng loại, lọc theo account', function () {
    Queue::fake();
    $conversation = ($this->makeConversation)();
    $message = ($this->makeMessage)($conversation);
    $file = messageFile($message);
    $conversation->contact->avatar()->save((new Attachment)->forceFill([
        'account_id' => $this->account->id, 'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => 'avatars/test/'.fake()->uuid(), 'filename' => 'a.png', 'content_type' => 'image/png', 'byte_size' => 1,
    ]));
    $otherAccount = Account::factory()->create();
    Contact::factory()->create(['account_id' => $otherAccount->id]);

    $engine = syncingSearchEngine();
    $this->artisan('search:reindex', ['--account' => $this->account->id])->assertSuccessful();

    expect($engine->indexedIds(SearchTarget::Messages))->toBe([$message->id])
        ->and($engine->indexedIds(SearchTarget::Files))->toBe([$file->id])
        ->and($engine->indexedIds(SearchTarget::Conversations))->toBe([$conversation->id])
        ->and($engine->indexedIds(SearchTarget::Contacts))->toBe([$conversation->contact_id]);

    $engine->calls = [];
    $this->artisan('search:reindex', ['--type' => 'contacts'])->assertSuccessful();

    expect(collect($engine->calls)->pluck(1)->unique()->all())->toBe(['contacts'])
        ->and($engine->indexedIds(SearchTarget::Contacts))->toBe(Contact::query()->orderBy('id')->pluck('id')->all());
});

it('search:reindex từ chối loại sai và không làm gì với engine PostgreSQL', function () {
    $this->artisan('search:reindex')->expectsOutputToContain('không có chỉ mục riêng')->assertSuccessful();

    syncingSearchEngine();
    $this->artisan('search:reindex', ['--type' => 'deals'])->assertExitCode(2);
});

it('đo backlog cho Pulse: số dòng tồn và tuổi dòng cũ nhất', function () {
    expect(app(SearchOutbox::class)->backlog())->toBe(['pending' => 0, 'oldest_age_seconds' => null]);

    DB::table(SearchOutbox::TABLE)->insert([
        ['account_id' => 1, 'document_type' => 'messages', 'document_id' => 1, 'operation' => 'upsert', 'created_at' => now()->subSeconds(90)],
        ['account_id' => 1, 'document_type' => 'messages', 'document_id' => 2, 'operation' => 'upsert', 'created_at' => now()],
    ]);

    $backlog = app(SearchOutbox::class)->backlog();

    expect($backlog['pending'])->toBe(2)
        ->and($backlog['oldest_age_seconds'])->toBeGreaterThanOrEqual(90)->toBeLessThan(120);

    Livewire::withoutLazyLoading()->test(SearchOutboxCard::class)
        ->assertSee('Outbox tìm kiếm')
        ->assertSee('Dòng còn tồn');
});

// Chi phí thêm trên luồng tin đến: số lượt INSERT outbox mỗi tin, thời gian của
// riêng các INSERT đó và thời gian ghi tin khi bật/tắt đồng bộ. In số đo ra để ghi
// vào báo cáo; chỉ khẳng định số lượt ghi (thời gian phụ thuộc máy).
it('đo chi phí ghi outbox trên luồng tin đến', function () {
    Queue::fake();
    config(['limits.conversation_message_per_minute' => 10_000]);
    $conversation = ($this->makeConversation)();
    $messageCount = 200;

    $outboxInserts = 0;
    $outboxInsertMs = 0.0;
    DB::listen(function ($query) use (&$outboxInserts, &$outboxInsertMs) {
        if (str_starts_with($query->sql, 'insert into "search_outbox"')) {
            $outboxInserts++;
            $outboxInsertMs += $query->time;
        }
    });

    $writeMessages = function (int $count) use ($conversation): float {
        $startedAt = hrtime(true);
        for ($index = 0; $index < $count; $index++) {
            ($this->makeMessage)($conversation, "tin số {$index}");
        }

        return (hrtime(true) - $startedAt) / 1e6;
    };

    $writeMessages(20);
    $withoutOutboxMs = $writeMessages($messageCount);
    $insertsWhenDisabled = $outboxInserts;

    syncingSearchEngine();
    $withOutboxMs = $writeMessages($messageCount);

    fwrite(STDERR, sprintf(
        "\n[outbox] %d tin: tắt %.2fms/tin, bật %.2fms/tin; %d INSERT outbox (%.1f/tin), riêng INSERT outbox %.3fms/lượt\n",
        $messageCount, $withoutOutboxMs / $messageCount, $withOutboxMs / $messageCount,
        $outboxInserts, $outboxInserts / $messageCount, $outboxInserts > 0 ? $outboxInsertMs / $outboxInserts : 0,
    ));

    expect($insertsWhenDisabled)->toBe(0)
        ->and($outboxInserts)->toBe($messageCount);
});
