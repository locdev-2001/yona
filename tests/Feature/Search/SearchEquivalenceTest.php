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
use App\Services\SearchService;

// Kết quả tìm kiếm trên một bộ dữ liệu trộn (có/không dấu, tên tệp nối gạch, nhóm
// Zalo, NULL, trùng mốc thời gian, hộp thư không được phép, tin quá mốc nhìn lại)
// được chốt theo nhãn: đổi engine hay đường nạp lại mà lệch một dòng, lệch thứ tự
// là đỏ.
beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    $this->agentMembership = AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $hiddenInbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $this->agent->inboxes()->attach($inbox->id);

    $moment = now()->subHour()->startOfSecond();
    $this->labels = [];
    $label = function (string $name, $model) {
        $this->labels[$model::class][$model->id] = $name;

        return $model;
    };

    $contact = fn (string $name, array $attributes) => $label($name, Contact::factory()->create(['account_id' => $this->account->id, ...$attributes]));
    $conversation = fn (string $name, Contact $owner, Inbox $in, array $attributes = []) => $label($name, Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $in->id,
        'contact_id' => $owner->id,
        'created_at' => $moment,
        ...$attributes,
    ]));
    $message = fn (string $name, Conversation $in, array $attributes) => $label($name, Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $in->inbox_id,
        'conversation_id' => $in->id,
        'created_at' => $moment,
        ...$attributes,
    ]));
    $file = fn (string $name, Message $on, array $attributes) => $label($name, $on->attachments()->save((new Attachment)->forceFill([
        'account_id' => $this->account->id,
        'file_type' => Attachment::FILE_TYPE_FILE,
        'path' => 'attachments/test/'.fake()->uuid(),
        'content_type' => 'application/pdf',
        'byte_size' => 1024,
        'created_at' => $moment,
        ...$attributes,
    ])));

    $accented = $contact('accented', ['name' => 'Nguyễn Văn Báo', 'email' => 'bao@shop.vn']);
    $plain = $contact('plain', ['name' => 'nguyen van bao gia', 'phone_number' => '+84900000001']);
    $nameless = $contact('nameless', ['name' => null, 'email' => 'bao.gia@shop.vn']);
    $group = $contact('group', ['name' => 'Nhóm Sỉ Miền Tây', 'additional_attributes' => ['zalo_thread_type' => 'group']]);
    $hiddenOwner = $contact('hiddenOwner', ['name' => 'Báo Giá Ẩn', 'email' => 'an@shop.vn']);

    $this->accentedChat = $conversation('accentedChat', $accented, $inbox);
    $plainChat = $conversation('plainChat', $plain, $inbox);
    $this->mailChat = $conversation('mailChat', $nameless, $inbox, ['additional_attributes' => ['mail_subject' => 'Báo giá tháng 9']]);
    $groupChat = $conversation('groupChat', $group, $inbox, ['created_at' => $moment->copy()->subMinute()]);
    $hiddenChat = $conversation('hiddenChat', $hiddenOwner, $hiddenInbox);

    $quote = $message('quote', $this->accentedChat, ['content' => 'Báo giá tháng 9 nhé']);
    $message('quotePlain', $plainChat, ['content' => 'bao gia thang 9']);
    $message('partial', $this->accentedChat, ['content' => 'báo giao hàng', 'created_at' => $moment->copy()->subMinute()]);
    $empty = $message('empty', $this->mailChat, ['content' => null]);
    $message('member', $groupChat, [
        'content' => 'còn hàng không',
        'sender_type' => 'Contact',
        'sender_id' => $group->id,
        'content_attributes' => ['sender' => ['external_id' => 'u-1', 'name' => 'Trần Bảo Gia', 'avatar' => '']],
    ]);
    $hiddenQuote = $message('hiddenQuote', $hiddenChat, ['content' => 'báo giá riêng']);
    $message('ancient', $this->accentedChat, ['content' => 'báo giá cũ', 'created_at' => now()->subMonths(SearchService::MESSAGE_LOOKBACK_MONTHS + 1)]);

    $file('dashedFile', $empty, ['filename' => 'bao-gia_thang-9.pdf']);
    $file('accentedFile', $quote, ['filename' => 'Báo giá.xlsx']);
    $file('fallbackFile', $quote, ['filename' => null, 'fallback_title' => 'Bảng báo giá sỉ', 'file_type' => Attachment::FILE_TYPE_FALLBACK]);
    $file('hiddenFile', $hiddenQuote, ['filename' => 'bao gia rieng.pdf']);
});

/** @return array<string, mixed> */
function equivalenceSearch(array $params, string $searchType): array
{
    return (new SearchService(test()->agent, test()->account->fresh(), $params, $searchType))->perform();
}

/** @return list<string> */
function equivalenceLabels(iterable $models): array
{
    return collect($models)->map(fn ($model) => test()->labels[$model::class][$model->id] ?? 'unlabelled')->values()->all();
}

it('keeps the ranked results of every tab on mixed data', function (string $query, array $expected) {
    $result = equivalenceSearch(['q' => $query], 'all');

    expect([
        'conversations' => equivalenceLabels($result['conversations']),
        'members' => $result['conversations']->pluck('matched_member_name')->all(),
        'messages' => equivalenceLabels($result['messages']),
        'contacts' => equivalenceLabels($result['contacts']),
        'files' => equivalenceLabels($result['files']),
    ])->toBe($expected);
})->with([
    'accented words' => ['báo giá', [
        'conversations' => ['mailChat', 'plainChat', 'groupChat'],
        'members' => [null, null, 'Trần Bảo Gia'],
        'messages' => ['quotePlain', 'quote', 'partial'],
        'contacts' => ['hiddenOwner', 'plain'],
        'files' => ['fallbackFile', 'accentedFile', 'dashedFile'],
    ]],
    'plain words' => ['bao gia', [
        'conversations' => ['mailChat', 'plainChat', 'groupChat'],
        'members' => [null, null, 'Trần Bảo Gia'],
        'messages' => ['quotePlain', 'quote', 'partial'],
        'contacts' => ['hiddenOwner', 'plain'],
        'files' => ['fallbackFile', 'accentedFile', 'dashedFile'],
    ]],
    'dashed file name' => ['bao-gia_thang-9', [
        'conversations' => ['mailChat'],
        'members' => [null],
        'messages' => ['quotePlain', 'quote'],
        'contacts' => [],
        'files' => ['dashedFile'],
    ]],
    'single word' => ['Bảo', [
        'conversations' => ['mailChat', 'plainChat', 'accentedChat', 'groupChat'],
        'members' => [null, null, null, 'Trần Bảo Gia'],
        'messages' => ['quotePlain', 'quote', 'partial'],
        'contacts' => ['hiddenOwner', 'plain', 'accented'],
        'files' => ['fallbackFile', 'accentedFile', 'dashedFile'],
    ]],
]);

it('keeps a conversation found by its #id', function () {
    $result = equivalenceSearch(['q' => '#'.$this->mailChat->display_id], 'Conversation');

    expect(equivalenceLabels($result['conversations']))->toContain('mailChat');
});

it('keeps the matches inside one conversation in time order', function () {
    $params = ['q' => 'bao', 'conversation_id' => $this->accentedChat->display_id];
    $service = new SearchService($this->agent, $this->account->fresh(), $params, 'Message');
    $messageIds = $service->matchedMessageIds();

    expect(equivalenceLabels(Message::query()->findMany($messageIds)->sortBy(fn (Message $message) => array_search($message->id, $messageIds, true))))
        ->toBe(['quote', 'partial'])
        ->and(equivalenceLabels($service->perform()['messages']))->toBe(['quote', 'partial'])
        ->and(equivalenceLabels(equivalenceSearch($params, 'Attachment')['files']))->toBe(['fallbackFile', 'accentedFile']);
});

it('keeps the conversation list filter set', function () {
    $conversations = Conversation::query()->where('account_id', $this->account->id);
    ConversationFinder::filterBySearchQuery($conversations, $this->agent, $this->account, 'thang 9');

    expect(equivalenceLabels($conversations->orderBy('id')->get()))->toBe(['accentedChat', 'plainChat', 'mailChat']);
});

it('keeps advanced filters on the same rows', function () {
    $this->account->forceFill(['feature_flags' => ['advanced_search' => true]])->save();
    $this->agentMembership->update(['role' => AccountUser::ROLE_ADMINISTRATOR]);

    $result = equivalenceSearch(['q' => 'bao gia', 'inbox_id' => $this->accentedChat->inbox_id, 'since' => now()->subDay()->timestamp], 'all');

    expect(equivalenceLabels($result['messages']))->toBe(['quotePlain', 'quote', 'partial'])
        ->and(equivalenceLabels($result['files']))->toBe(['fallbackFile', 'accentedFile', 'dashedFile'])
        ->and(equivalenceLabels($result['conversations']))->toBe(['hiddenChat', 'mailChat', 'plainChat', 'groupChat']);
});
