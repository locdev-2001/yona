<?php

use App\Finders\ConversationFinder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Search\Drivers\PostgresSearchEngine;
use App\Search\SearchEngine;
use App\Search\SearchHits;
use App\Search\SearchQuery;
use App\Search\SearchTarget;
use App\Services\SearchService;
use Illuminate\Database\Eloquent\Builder;

// Engine chỉ gợi ý id. Engine sai (id account khác, id đã xoá, id ở hộp thư người
// tìm không được xem) không được làm lộ bản ghi: SearchService nạp lại dưới đúng
// điều kiện quyền và giữ thứ tự engine cho phần còn lại.
beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $hiddenInbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $this->agent->inboxes()->attach($inbox->id);

    $otherAccount = Account::factory()->create();
    $otherInbox = Inbox::factory()->create(['account_id' => $otherAccount->id, 'enable_auto_assignment' => false]);

    $scene = function (Account $account, Inbox $in) {
        $contact = Contact::factory()->create(['account_id' => $account->id, 'email' => fake()->unique()->safeEmail()]);
        $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $in->id, 'contact_id' => $contact->id]);
        $message = Message::factory()->create(['account_id' => $account->id, 'inbox_id' => $in->id, 'conversation_id' => $conversation->id, 'content' => 'báo giá']);
        $file = $message->attachments()->save((new Attachment)->forceFill([
            'account_id' => $account->id,
            'file_type' => Attachment::FILE_TYPE_FILE,
            'path' => 'attachments/test/'.fake()->uuid(),
            'filename' => 'bao-gia.pdf',
            'content_type' => 'application/pdf',
            'byte_size' => 1024,
        ]));

        return compact('contact', 'conversation', 'message', 'file');
    };

    $this->visible = $scene($this->account, $inbox);
    $this->secondVisible = $scene($this->account, $inbox);
    $this->hidden = $scene($this->account, $hiddenInbox);
    $this->foreign = $scene($otherAccount, $otherInbox);
    $this->deletedIds = collect($scene($this->account, $inbox))->map(fn ($model) => $model->id)->all();
    Attachment::query()->whereKey($this->deletedIds['file'])->delete();
    Message::query()->whereKey($this->deletedIds['message'])->delete();
    Conversation::query()->whereKey($this->deletedIds['conversation'])->delete();
    Contact::query()->whereKey($this->deletedIds['contact'])->delete();
});

// Engine giả trả đúng danh sách id cho sẵn theo từng loại, bất kể từ khoá.
function fakeSearchEngine(array $idsByTarget): void
{
    app()->instance(SearchEngine::class, new class($idsByTarget) implements SearchEngine
    {
        /** @param array<string, list<int>> $idsByTarget */
        public function __construct(private readonly array $idsByTarget) {}

        public function search(SearchQuery $query): SearchHits
        {
            return new SearchHits($this->idsByTarget[$query->target->value] ?? []);
        }

        public function matchingConversationIds(SearchQuery $query): Builder|array
        {
            return $this->idsByTarget[SearchTarget::Conversations->value] ?? [];
        }

        public function keepsSeparateIndex(): bool
        {
            return false;
        }

        public function index(SearchTarget $target, array $ids): void {}

        public function remove(SearchTarget $target, array $ids): void {}
    });
}

/** @return list<int> */
function engineSuggestions(string $kind): array
{
    // Thứ tự cố ý đảo: bản ghi được xem thứ hai đứng trước để kiểm giữ thứ tự engine.
    return [
        test()->foreign[$kind]->id,
        test()->secondVisible[$kind]->id,
        test()->deletedIds[$kind],
        test()->hidden[$kind]->id,
        test()->visible[$kind]->id,
    ];
}

function isolatedSearch(array $params = []): SearchService
{
    return new SearchService(test()->agent, test()->account->fresh(), ['q' => 'bao gia', ...$params], 'all');
}

it('keeps only permitted records of every tab in the order the engine ranked them', function () {
    fakeSearchEngine([
        'conversations' => engineSuggestions('conversation'),
        'messages' => engineSuggestions('message'),
        'contacts' => engineSuggestions('contact'),
        'files' => engineSuggestions('file'),
    ]);

    $result = isolatedSearch()->perform();

    expect($result['conversations']->pluck('id')->all())->toBe([$this->secondVisible['conversation']->id, $this->visible['conversation']->id])
        ->and($result['messages']->pluck('id')->all())->toBe([$this->secondVisible['message']->id, $this->visible['message']->id])
        ->and($result['files']->pluck('id')->all())->toBe([$this->secondVisible['file']->id, $this->visible['file']->id])
        // Liên hệ thuộc account, không thuộc hộp thư: chỉ id account khác và id đã xoá rơi ra.
        ->and($result['contacts']->pluck('id')->all())->toBe([
            $this->secondVisible['contact']->id,
            $this->hidden['contact']->id,
            $this->visible['contact']->id,
        ]);
});

it('drops foreign, deleted and hidden messages from the in-conversation match list', function () {
    fakeSearchEngine(['messages' => engineSuggestions('message')]);

    $ids = isolatedSearch(['conversation_id' => $this->visible['conversation']->display_id])->matchedMessageIds();

    expect($ids)->toBe([$this->secondVisible['message']->id, $this->visible['message']->id]);
});

it('keeps foreign, deleted and hidden conversations out of the conversation list filter', function () {
    fakeSearchEngine(['conversations' => engineSuggestions('conversation')]);

    $conversations = Conversation::query();
    ConversationFinder::filterBySearchQuery($conversations, $this->agent, $this->account, 'bao gia');

    expect($conversations->orderBy('id')->pluck('id')->all())
        ->toBe([$this->visible['conversation']->id, $this->secondVisible['conversation']->id]);
});

it('lets an administrator see every inbox of the account but never another account', function () {
    $this->account->accountUsers()->where('user_id', $this->agent->id)->update(['role' => AccountUser::ROLE_ADMINISTRATOR]);
    fakeSearchEngine(['messages' => engineSuggestions('message'), 'conversations' => engineSuggestions('conversation')]);

    $result = isolatedSearch()->perform();

    expect($result['messages']->pluck('id')->all())
        ->toBe([$this->secondVisible['message']->id, $this->hidden['message']->id, $this->visible['message']->id])
        ->and($result['conversations']->pluck('id')->all())
        ->toBe([$this->secondVisible['conversation']->id, $this->hidden['conversation']->id, $this->visible['conversation']->id]);
});

it('resolves the engine named in config', function () {
    expect(app(SearchEngine::class))->toBeInstanceOf(PostgresSearchEngine::class);

    config(['search.driver' => 'missing']);

    expect(fn () => app(SearchEngine::class))->toThrow(InvalidArgumentException::class);
});
