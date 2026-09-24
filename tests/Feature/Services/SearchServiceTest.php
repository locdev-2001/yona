<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\SearchService;

// Port từ spec/services/search_service_spec.rb.
// Bỏ các khối Elasticsearch/Searchkick (:opensearch + #advanced_search) — nhánh
// đó là enterprise, PHP không port (xem note e2).
beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    $this->accountUser = AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
    ]);
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $this->user->inboxes()->attach($this->inbox->id);

    $this->harry = Contact::factory()->create([
        'account_id' => $this->account->id,
        'name' => 'Harry Potter',
        'email' => 'test@test.com',
    ]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->harry->id,
    ]);
    $this->message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
        'content' => 'Harry Potter is a wizard',
    ]);
});

function e2Search(array $params, string $searchType): SearchService
{
    return new SearchService(test()->user, test()->account->fresh(), $params, $searchType);
}

/** @return list<int> */
function searchResultIds(string $query, string $searchType, array $params = []): array
{
    $key = ['Message' => 'messages', 'Conversation' => 'conversations', 'Contact' => 'contacts', 'Attachment' => 'files'][$searchType];

    return e2Search(['q' => $query, ...$params], $searchType)->perform()[$key]->pluck('id')->all();
}

function searchTestMessage(array $attributes = []): Message
{
    return Message::factory()->create([
        'account_id' => test()->account->id,
        'inbox_id' => test()->inbox->id,
        'conversation_id' => test()->conversation->id,
        ...$attributes,
    ]);
}

function searchTestFile(Message $message, array $attributes = []): Attachment
{
    // forceFill: created_at không nằm trong $fillable.
    $attachment = (new Attachment)->forceFill([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_FILE,
        'path' => 'attachments/test/'.fake()->uuid().'.pdf',
        'filename' => 'tai-lieu.pdf',
        'content_type' => 'application/pdf',
        'byte_size' => 2048,
        ...$attributes,
    ]);

    return $message->attachments()->save($attachment);
}

describe('#perform', function () {
    it('returns every collection for the "all" search type', function () {
        expect(array_keys(e2Search(['q' => 'Potter'], 'all')->perform()))
            ->toBe(['conversations', 'messages', 'contacts', 'files', 'articles']);
    });

    it('returns only the collection matching the search type', function (string $searchType, string $key) {
        expect(array_keys(e2Search(['q' => 'Potter'], $searchType)->perform()))->toBe([$key]);
    })->with([
        ['Contact', 'contacts'],
        ['Message', 'messages'],
        ['Conversation', 'conversations'],
        ['Attachment', 'files'],
        ['Article', 'articles'],
    ]);
});

describe('contact search', function () {
    it('searches name, email, phone_number and identifier ordered by last_activity_at', function () {
        Contact::factory()->create(['account_id' => $this->account->id]);
        // Liên hệ chưa xác định danh tính (không email/phone/identifier) không lên kết quả.
        Contact::factory()->create(['account_id' => $this->account->id, 'name' => 'Harry Potter']);
        $harry2 = Contact::factory()->create([
            'account_id' => $this->account->id,
            'email' => 'HarryPotter@test.com',
            'last_activity_at' => now()->subDays(2),
        ]);
        $harry3 = Contact::factory()->create([
            'account_id' => $this->account->id,
            'identifier' => 'Potter123',
            'last_activity_at' => now()->subDay(),
        ]);
        $harry4 = Contact::factory()->create([
            'account_id' => $this->account->id,
            'identifier' => 'Potter1235',
            'last_activity_at' => now()->subMinutes(2),
        ]);
        $this->harry->update(['last_activity_at' => now()->subDays(10)]);

        $ids = e2Search(['q' => 'Potter '], 'Contact')->perform()['contacts']->pluck('id')->all();

        expect($ids)->toBe([$harry4->id, $harry3->id, $harry2->id, $this->harry->id]);
    });
});

describe('message search', function () {
    it('searches message content and returns created_at desc', function () {
        $message2 = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'harry is cool',
            'created_at' => now()->addSecond(),
        ]);
        // Tin ở account khác.
        Message::factory()->create(['content' => 'Harry Potter is a wizard']);
        // Tin ở inbox người dùng không có quyền.
        $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $otherInbox->id,
            'content' => 'Harry Potter is a wizard',
        ]);

        $ids = e2Search(['q' => 'Harry'], 'Message')->perform()['messages']->pluck('id')->all();

        expect($ids)->toBe([$message2->id, $this->message->id]);
    });

    // Đường mới (bỏ dấu) với từ khoá ASCII phải ra đúng tập và đúng thứ tự như
    // đường ILIKE cũ, trên dữ liệu trộn: nội dung NULL, trùng created_at, hoa/thường.
    it('returns exactly what the plain ILIKE search returned for ASCII queries', function () {
        $sameMoment = now()->subHour();
        searchTestMessage(['content' => null]);
        searchTestMessage(['content' => 'Order SHIPPED today', 'created_at' => $sameMoment]);
        searchTestMessage(['content' => 'second order shipped', 'created_at' => $sameMoment]);
        searchTestMessage(['content' => 'ORDER cancelled', 'created_at' => now()->subDays(3)]);
        searchTestMessage(['content' => 'nothing relevant']);

        foreach (['order', 'SHIPPED', 'der sh', 'Harry', 'zzz'] as $query) {
            $legacyIds = Message::query()
                ->where('account_id', $this->account->id)
                ->where('created_at', '>=', now()->subMonths(SearchService::MESSAGE_LOOKBACK_MONTHS))
                ->whereRaw('content ILIKE ?', ["%{$query}%"])
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->pluck('id')
                ->all();

            expect(searchResultIds($query, 'Message'))->toBe($legacyIds);
        }
    });

    it('orders with id as tiebreaker when created_at collides', function () {
        $sameMoment = now()->subMinute();
        $first = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'phoenix feather',
            'created_at' => $sameMoment,
        ]);
        $second = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'phoenix wand',
            'created_at' => $sameMoment,
        ]);

        $ids = e2Search(['q' => 'phoenix'], 'Message')->perform()['messages']->pluck('id')->all();

        expect($ids)->toBe([$second->id, $first->id]);
    });

    it('only searches messages from the last twelve months', function () {
        $lastYear = searchTestMessage(['content' => 'Harry last year', 'created_at' => now()->subMonths(11)]);
        searchTestMessage(['content' => 'Harry ancient message', 'created_at' => now()->subMonths(13)]);

        expect(searchResultIds('Harry', 'Message'))->toBe([$this->message->id, $lastYear->id]);
    });

    describe('advanced_search filters', function () {
        beforeEach(function () {
            $this->account->forceFill(['feature_flags' => ['advanced_search' => true]])->save();
            $this->agent = User::factory()->create();
            AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
            $this->inbox2 = Inbox::factory()->create(['account_id' => $this->account->id]);
            $this->user->inboxes()->attach($this->inbox2->id);

            $conversation2 = Conversation::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox2->id,
            ]);

            $this->oldMessage = Message::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox->id,
                'conversation_id' => $this->conversation->id,
                'content' => 'old wizard message',
                'sender_type' => 'Contact',
                'sender_id' => $this->harry->id,
                'created_at' => now()->subDays(80),
            ]);
            $this->recentMessage = Message::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox->id,
                'conversation_id' => $this->conversation->id,
                'content' => 'recent wizard message',
                'sender_type' => 'Contact',
                'sender_id' => $this->harry->id,
                'created_at' => now()->subDay(),
            ]);
            $this->agentMessage = Message::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox->id,
                'conversation_id' => $this->conversation->id,
                'content' => 'wizard from agent',
                'sender_type' => 'User',
                'sender_id' => $this->agent->id,
                'created_at' => now()->subDay(),
            ]);
            $this->inbox2Message = Message::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox2->id,
                'conversation_id' => $conversation2->id,
                'content' => 'wizard in inbox2',
                'sender_type' => 'Contact',
                'sender_id' => $this->harry->id,
                'created_at' => now()->subDay(),
            ]);
        });

        it('filters messages by time range', function () {
            $ids = e2Search(['q' => 'wizard', 'since' => now()->subDays(50)->timestamp], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toContain($this->recentMessage->id, $this->agentMessage->id, $this->inbox2Message->id)
                ->and($ids)->not->toContain($this->oldMessage->id);
        });

        it('filters messages by contact sender', function () {
            $ids = e2Search(['q' => 'wizard', 'from' => "contact:{$this->harry->id}"], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toContain($this->recentMessage->id, $this->oldMessage->id, $this->inbox2Message->id)
                ->and($ids)->not->toContain($this->agentMessage->id);
        });

        it('filters messages by agent sender', function () {
            $ids = e2Search(['q' => 'wizard', 'from' => "agent:{$this->agent->id}"], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toBe([$this->agentMessage->id]);
        });

        it('ignores an invalid from parameter', function () {
            $ids = e2Search(['q' => 'wizard', 'from' => 'invalid:format'], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toContain($this->agentMessage->id, $this->recentMessage->id);
        });

        it('filters messages by inbox', function () {
            $ids = e2Search(['q' => 'wizard', 'inbox_id' => $this->inbox2->id], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toBe([$this->inbox2Message->id]);
        });

        it('combines every filter', function () {
            $ids = e2Search([
                'q' => 'wizard',
                'since' => now()->subDays(50)->timestamp,
                'inbox_id' => $this->inbox->id,
                'from' => "contact:{$this->harry->id}",
            ], 'Message')->perform()['messages']->pluck('id')->all();

            expect($ids)->toBe([$this->recentMessage->id]);
        });

        it('silently caps since to ninety days ago', function () {
            $ids = e2Search(['q' => 'wizard', 'since' => now()->subDays(200)->timestamp], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toContain($this->oldMessage->id);
        });
    });
});

describe('conversation search', function () {
    it('searches conversations through contact information ordered by created_at desc', function () {
        $random = Contact::factory()->create(['account_id' => $this->account->id]);
        Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $random->id,
        ]);
        $conversation2 = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->harry->id,
            'created_at' => now()->addSecond(),
        ]);

        $ids = e2Search(['q' => 'Harry'], 'Conversation')->perform()['conversations']->pluck('id')->all();

        expect($ids)->toBe([$conversation2->id, $this->conversation->id]);
    });

    it('searches conversations by display id', function () {
        $random = Contact::factory()->create([
            'account_id' => $this->account->id,
            'name' => 'random',
            'email' => 'random@random.test',
            'identifier' => 'random',
        ]);
        $newConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $random->id,
        ]);

        $ids = e2Search(['q' => (string) $newConversation->display_id], 'Conversation')
            ->perform()['conversations']->pluck('id')->all();

        expect($ids)->toContain($newConversation->id);
    });

    it('caps the since filter to ninety days ago when advanced_search is on', function () {
        $this->account->forceFill(['feature_flags' => ['advanced_search' => true]])->save();
        $oldConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->harry->id,
            'last_activity_at' => now()->subDays(100),
        ]);
        $recentConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->harry->id,
            'last_activity_at' => now()->subDay(),
        ]);

        $ids = e2Search(['q' => 'Harry', 'since' => now()->subDays(100)->timestamp], 'Conversation')
            ->perform()['conversations']->pluck('id')->all();

        expect($ids)->toContain($recentConversation->id)->and($ids)->not->toContain($oldConversation->id);
    });
});

describe('message base query inbox scoping', function () {
    it('does not filter by inbox for an administrator', function () {
        $this->accountUser->update(['role' => AccountUser::ROLE_ADMINISTRATOR]);
        Inbox::factory()->create(['account_id' => $this->account->id]);

        expect(e2Search(['q' => 'test'], 'Message')->messageBaseQuery()->toSql())->not->toContain('inbox_id');
    });

    it('filters by accessible inbox when the agent has limited access', function () {
        Inbox::factory()->create(['account_id' => $this->account->id]);

        $sql = e2Search(['q' => 'test'], 'Message')->messageBaseQuery()->toSql();

        expect($sql)->toContain('created_at')->and($sql)->toContain('inbox_id');
    });

    it('skips inbox filtering when the agent can access every inbox', function () {
        $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $this->user->inboxes()->attach($otherInbox->id);

        expect(e2Search(['q' => 'test'], 'Message')->messageBaseQuery()->toSql())->not->toContain('inbox_id');
    });
});

describe('pagination', function () {
    it('returns fifteen records per page', function () {
        Contact::factory()->count(20)->create([
            'account_id' => $this->account->id,
            'identifier' => fn () => fake()->unique()->uuid(),
            'name' => 'Magic contact',
        ]);

        expect(e2Search(['q' => 'Magic'], 'Contact')->perform()['contacts'])->toHaveCount(15)
            ->and(e2Search(['q' => 'Magic', 'page' => 2], 'Contact')->perform()['contacts'])->toHaveCount(5);
    });
});

describe('accent-insensitive matching', function () {
    it('finds a Vietnamese contact name with or without accents and in any case', function (string $query) {
        $duc = Contact::factory()->create([
            'account_id' => $this->account->id,
            'name' => 'Nguyễn Văn Đức',
            'email' => 'duc@example.test',
        ]);

        expect(searchResultIds($query, 'Contact'))->toContain($duc->id);
    })->with(['nguyen van duc', 'NGUYEN', 'Đức', 'duc']);

    it('finds message content typed without accents', function () {
        $quote = searchTestMessage(['content' => 'Báo giá tháng 9']);

        expect(searchResultIds('bao gia', 'Message'))->toBe([$quote->id]);
    });

    it('matches decomposed stored text with a composed query and the other way round', function () {
        $decomposed = searchTestMessage(['content' => Normalizer::normalize('Chuyển khoản xong', Normalizer::FORM_D)]);
        $composed = searchTestMessage(['content' => 'Đã nhận hàng', 'created_at' => now()->addSecond()]);

        expect(searchResultIds('Chuyển khoản', 'Message'))->toBe([$decomposed->id])
            ->and(searchResultIds(Normalizer::normalize('nhận hàng', Normalizer::FORM_D), 'Message'))->toBe([$composed->id]);
    });
});

describe('LIKE wildcards in the query', function () {
    it('treats percent and underscore as literal characters', function () {
        $discount = searchTestMessage(['content' => 'giảm 50% hôm nay']);
        searchTestMessage(['content' => '500 đơn đã giao']);
        searchTestMessage(['content' => 'mã axb']);

        expect(searchResultIds('50%', 'Message'))->toBe([$discount->id])
            ->and(searchResultIds('a_b', 'Message'))->toBe([]);
    });
});

describe('conversation search by group and email subject', function () {
    beforeEach(function () {
        $this->group = Contact::factory()->create([
            'account_id' => $this->account->id,
            'name' => 'Hội Khách Sỉ Miền Tây',
            'additional_attributes' => ['zalo_thread_type' => 'group'],
        ]);
        $this->groupConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->group->id,
        ]);
        searchTestMessage([
            'conversation_id' => $this->groupConversation->id,
            'sender_type' => 'Contact',
            'sender_id' => $this->group->id,
            'content' => 'Còn hàng không shop?',
            'content_attributes' => ['sender' => ['external_id' => 'u-1', 'name' => 'Lan Anh', 'avatar' => '']],
        ]);
    });

    it('finds a group conversation by its name typed without accents', function () {
        $conversations = e2Search(['q' => 'hoi khach si'], 'Conversation')->perform()['conversations'];

        expect($conversations->pluck('id')->all())->toBe([$this->groupConversation->id])
            ->and($conversations->first()->matched_member_name)->toBeNull();
    });

    it('finds the group a member has written in and names the matching member', function (string $query) {
        $conversations = e2Search(['q' => $query], 'Conversation')->perform()['conversations'];

        expect($conversations->pluck('id')->all())->toBe([$this->groupConversation->id])
            ->and($conversations->first()->matched_member_name)->toBe('Lan Anh');
    })->with(['lan anh', 'LAN']);

    it('leaves matched_member_name empty when the conversation matched on the customer', function () {
        $conversations = e2Search(['q' => 'Harry'], 'Conversation')->perform()['conversations'];

        expect($conversations->pluck('id')->all())->toBe([$this->conversation->id])
            ->and($conversations->first()->matched_member_name)->toBeNull();
    });

    it('does not return a group whose inbox the agent cannot access', function () {
        $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $this->groupConversation->update(['inbox_id' => $otherInbox->id]);

        expect(searchResultIds('lan anh', 'Conversation'))->toBe([]);
    });

    it('finds an email conversation by its subject typed without accents', function () {
        $emailConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'additional_attributes' => ['mail_subject' => 'Đơn hàng tháng 9'],
        ]);

        expect(searchResultIds('don hang', 'Conversation'))->toBe([$emailConversation->id]);
    });
});

describe('file search', function () {
    it('finds a file by its name typed without accents', function () {
        $file = searchTestFile($this->message, ['filename' => 'Báo giá T9.pdf']);
        searchTestFile($this->message, ['filename' => 'hop-dong.pdf']);

        expect(searchResultIds('bao gia', 'Attachment'))->toBe([$file->id]);
    });

    it('finds a file that could not be downloaded by the name the channel reported', function () {
        $fallback = searchTestFile($this->message, [
            'file_type' => Attachment::FILE_TYPE_FALLBACK,
            'path' => null,
            'filename' => null,
            'content_type' => null,
            'external_url' => 'https://cdn.example.test/hd.docx',
            'fallback_title' => 'Hợp đồng.docx',
        ]);

        expect(searchResultIds('hop dong', 'Attachment'))->toBe([$fallback->id]);
    });

    it('ignores locations whose title happens to match', function () {
        searchTestFile($this->message, [
            'file_type' => Attachment::FILE_TYPE_LOCATION,
            'path' => null,
            'filename' => null,
            'content_type' => null,
            'fallback_title' => 'Kho Hợp Đồng, Quận 1',
            'coordinates_lat' => 10.77,
            'coordinates_long' => 106.7,
        ]);

        expect(searchResultIds('hop dong', 'Attachment'))->toBe([]);
    });

    it('ignores avatars of contacts, agents and inboxes', function () {
        $avatar = ['account_id' => $this->account->id, 'path' => 'avatars/hop-dong.png', 'filename' => 'Hợp đồng.png', 'content_type' => 'image/png'];
        $this->harry->avatar()->create($avatar);
        $this->user->avatar()->create($avatar);
        $this->inbox->avatar()->create($avatar);

        expect(searchResultIds('hop dong', 'Attachment'))->toBe([]);
    });

    it('limits an agent to files of inboxes they belong to while an administrator sees all', function () {
        $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $otherMessage = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $otherInbox->id,
            'content' => 'tệp kèm',
        ]);
        $hidden = searchTestFile($otherMessage, ['filename' => 'Báo giá riêng.pdf']);
        $visible = searchTestFile($this->message, ['filename' => 'Báo giá chung.pdf']);

        expect(searchResultIds('bao gia', 'Attachment'))->toBe([$visible->id]);

        $this->accountUser->update(['role' => AccountUser::ROLE_ADMINISTRATOR]);

        expect(searchResultIds('bao gia', 'Attachment'))->toEqualCanonicalizing([$visible->id, $hidden->id]);
    });

    it('skips files of messages older than the search window', function () {
        $ancient = searchTestMessage(['content' => null, 'created_at' => now()->subMonths(SearchService::MESSAGE_LOOKBACK_MONTHS + 1)]);
        searchTestFile($ancient, ['filename' => 'Báo giá cũ.pdf']);

        expect(searchResultIds('bao gia', 'Attachment'))->toBe([]);
    });

    it('includes files attached to private notes like their messages', function () {
        $note = searchTestMessage(['content' => 'ghi chú', 'private' => true, 'message_type' => Message::TYPE_OUTGOING]);
        $file = searchTestFile($note, ['filename' => 'Báo giá nội bộ.pdf']);

        expect(searchResultIds('bao gia', 'Attachment'))->toBe([$file->id]);
    });

    it('orders newest first with id as tiebreaker and pages fifteen at a time', function () {
        $sameMoment = now()->subMinute();
        $files = collect(range(1, 17))->map(fn (int $index) => searchTestFile($this->message, [
            'filename' => "Báo giá {$index}.pdf",
            'created_at' => $index <= 2 ? $sameMoment : $sameMoment->copy()->subMinutes($index),
        ]));

        $firstPage = searchResultIds('bao gia', 'Attachment');
        $secondPage = searchResultIds('bao gia', 'Attachment', ['page' => 2]);

        expect($firstPage)->toHaveCount(15)
            ->and(array_slice($firstPage, 0, 2))->toBe([$files[1]->id, $files[0]->id])
            ->and($secondPage)->toBe([$files[15]->id, $files[16]->id]);
    });

    it('narrows files to one inbox with the advanced search inbox filter', function () {
        $this->account->forceFill(['feature_flags' => ['advanced_search' => true]])->save();
        $secondInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $this->user->inboxes()->attach($secondInbox->id);
        $secondMessage = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $secondInbox->id,
            'content' => 'tệp kèm',
        ]);
        $inSecondInbox = searchTestFile($secondMessage, ['filename' => 'Báo giá B.pdf']);
        searchTestFile($this->message, ['filename' => 'Báo giá A.pdf']);

        expect(searchResultIds('bao gia', 'Attachment', ['inbox_id' => $secondInbox->id]))->toBe([$inSecondInbox->id]);
    });

    it('names a file the same way in PHP and in SQL', function (?string $filename, ?string $fallbackTitle) {
        $attachment = searchTestFile($this->message, [
            'file_type' => Attachment::FILE_TYPE_FALLBACK,
            'path' => null,
            'filename' => $filename,
            'fallback_title' => $fallbackTitle,
        ]);

        $sqlName = Attachment::query()->whereKey($attachment->id)
            ->selectRaw(Attachment::DISPLAY_NAME_SQL.' AS display_name')
            ->value('display_name');

        expect($attachment->fresh()->displayName())->toBe($sqlName);
    })->with([
        ['bao-gia.pdf', 'Tiêu đề'],
        ['', 'Hợp đồng.docx'],
        [null, 'Hợp đồng.docx'],
        [' ', 'Hợp đồng.docx'],
        [null, null],
    ]);
});
