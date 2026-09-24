<?php

use App\Finders\ConversationFinder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// Dữ liệu trộn: nhiều hội thoại trùng last_activity_at, một phần created_at NULL,
// hai liên hệ để ô tìm lọc ra một nửa — đủ để lộ lệch thứ tự giữa page và cursor.
function cursorFinderFixtures(): array
{
    $account = Account::factory()->create();
    $admin = User::factory()->create();
    $accountUser = AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $admin->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);

    $contacts = collect(['Lan Anh', 'Minh Quân'])->map(function (string $name) use ($account, $inbox) {
        $contact = Contact::factory()->create(['account_id' => $account->id, 'name' => $name]);
        $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

        return [$contact, $contactInbox];
    });

    $sharedActivityTimes = ['2026-09-01 08:00:00.123456', '2026-09-02 09:30:00', '2026-09-03 10:00:00.5'];

    foreach (range(1, 70) as $index) {
        [$contact, $contactInbox] = $contacts[$index % 2];
        $conversation = Conversation::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contact->id,
            'contact_inbox_id' => $contactInbox->id,
        ]);

        DB::table('conversations')->where('id', $conversation->id)->update([
            'last_activity_at' => $sharedActivityTimes[$index % 3],
            'created_at' => $index % 4 === 0 ? null : $sharedActivityTimes[($index + 1) % 3],
        ]);
    }

    return [$account, $admin, $accountUser];
}

function walkConversationPages(array $fixtures, array $params): array
{
    [$account, $admin, $accountUser] = $fixtures;
    $ids = [];

    for ($page = 1; ; $page++) {
        $result = (new ConversationFinder($admin, $account, $accountUser, [...$params, 'page' => $page]))->perform();
        $pageIds = $result['conversations']->pluck('id')->all();

        if ($pageIds === []) {
            return $ids;
        }

        $ids = [...$ids, ...$pageIds];
    }
}

function walkConversationCursor(array $fixtures, array $params): array
{
    [$account, $admin, $accountUser] = $fixtures;
    $ids = [];
    $cursor = null;

    do {
        $result = (new ConversationFinder($admin, $account, $accountUser, [...$params, 'cursor' => $cursor]))->perform();
        $ids = [...$ids, ...$result['conversations']->pluck('id')->all()];
        $cursor = $result['next_cursor'];
    } while ($cursor !== null);

    return $ids;
}

it('walks the same conversations in the same order with cursor as with page', function (array $params) {
    $fixtures = cursorFinderFixtures();

    $byPage = walkConversationPages($fixtures, $params);
    $byCursor = walkConversationCursor($fixtures, $params);

    expect($byCursor)->toBe($byPage)
        ->and(count($byCursor))->toBe(count(array_unique($byCursor)))
        ->and(count($byCursor))->toBeGreaterThan(ConversationFinder::RESULTS_PER_PAGE);
})->with([
    'mới hoạt động trước' => [['sort_by' => 'last_activity_at_desc']],
    'cũ hoạt động trước' => [['sort_by' => 'last_activity_at_asc']],
    'mặc định' => [[]],
    'tạo mới trước, có NULL' => [['sort_by' => 'created_at_desc']],
    'tạo cũ trước, có NULL' => [['sort_by' => 'created_at_asc']],
    'lọc theo ô tìm' => [['q' => 'Lan', 'sort_by' => 'last_activity_at_desc', 'status' => 'all']],
]);

it('skips tab counts on cursor pages and ends with a null cursor', function () {
    $fixtures = cursorFinderFixtures();
    [$account, $admin, $accountUser] = $fixtures;

    $firstPage = (new ConversationFinder($admin, $account, $accountUser, []))->perform();
    $secondPage = (new ConversationFinder($admin, $account, $accountUser, ['cursor' => $firstPage['next_cursor']]))->perform();
    $lastPage = (new ConversationFinder($admin, $account, $accountUser, ['cursor' => $secondPage['next_cursor']]))->perform();

    expect($firstPage['count']['all_count'])->toBe(70)
        ->and($firstPage['next_cursor'])->toBeString()
        ->and($secondPage['count'])->toBeNull()
        ->and($lastPage['conversations'])->toHaveCount(20)
        ->and($lastPage['next_cursor'])->toBeNull();
});

it('keeps page-only pagination for expression sorts', function () {
    $fixtures = cursorFinderFixtures();
    [$account, $admin, $accountUser] = $fixtures;

    $result = (new ConversationFinder($admin, $account, $accountUser, ['sort_by' => 'priority_desc']))->perform();

    expect($result['next_cursor'])->toBeNull()
        ->and(fn () => (new ConversationFinder($admin, $account, $accountUser, [
            'sort_by' => 'priority_desc',
            'cursor' => rtrim(base64_encode('["2026-09-01 08:00:00",1]'), '='),
        ]))->perform())->toThrow(ValidationException::class);
});

it('rejects a malformed cursor instead of querying with it', function (string $cursor) {
    $fixtures = cursorFinderFixtures();
    [$account, $admin, $accountUser] = $fixtures;

    expect(fn () => (new ConversationFinder($admin, $account, $accountUser, ['cursor' => $cursor]))->perform())
        ->toThrow(ValidationException::class);
})->with([
    'không phải base64' => ['%%%'],
    'thiếu id' => [rtrim(base64_encode('["2026-09-01 08:00:00"]'), '=')],
    'thời điểm sai định dạng' => [rtrim(base64_encode('["hôm qua",1]'), '=')],
]);

it('counts tabs again as soon as a conversation changes', function () {
    $fixtures = cursorFinderFixtures();
    [$account, $admin, $accountUser] = $fixtures;
    $meta = fn () => (new ConversationFinder($admin, $account, $accountUser, []))->performMetaOnly()['count'];

    expect($meta()['mine_count'])->toBe(0);

    Conversation::query()->where('account_id', $account->id)->first()->update(['assignee_id' => $admin->id]);

    expect($meta()['mine_count'])->toBe(1);
});
