<?php

namespace Tests\Support;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

/**
 * Một account cỡ production thật (vài agent, một hộp thư Zalo, vài chục hội thoại
 * có ảnh và tệp, thông báo chưa đọc) để đo số truy vấn của các luồng hộp thư. Cỡ
 * đủ lớn để N+1 lộ ra: truy vấn lặp theo từng tin/thẻ/agent làm số đếm tăng rõ.
 */
final class InboxWorkload
{
    public const AGENT_COUNT = 6;

    public const MESSAGES_PER_CONVERSATION = 9;

    /**
     * @param  list<User>  $agents
     * @param  list<Conversation>  $conversations
     */
    private function __construct(
        public readonly Account $account,
        public readonly User $admin,
        public readonly array $agents,
        public readonly Inbox $inbox,
        public readonly array $conversations,
        public readonly Conversation $conversation,
    ) {}

    public static function build(int $conversationCount = 6): self
    {
        Queue::fake();
        Http::fake(['*' => Http::response(['ok' => true, 'source_id' => 'sent-'.uniqid()])]);

        $account = Account::factory()->create(['locale' => 'vi']);
        $admin = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $admin->id, 'role' => AccountUser::ROLE_ADMINISTRATOR]);

        $agents = [$admin];
        foreach (range(2, self::AGENT_COUNT) as $index) {
            $agent = User::factory()->create();
            AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
            $agents[] = $agent;
        }

        $inbox = Inbox::factory()->zalo()->create(['account_id' => $account->id]);
        $inbox->members()->attach(array_map(fn (User $agent) => $agent->id, $agents));
        Inbox::factory()->create(['account_id' => $account->id]);

        foreach (['vip', 'don-hang', 'khieu-nai', 'bao-gia'] as $title) {
            Label::factory()->create(['account_id' => $account->id, 'title' => $title]);
        }

        $conversations = [];
        foreach (range(1, $conversationCount) as $index) {
            $conversations[] = self::conversationWithHistory($account, $inbox, $agents[$index % count($agents)], $index);
        }

        foreach (array_slice($conversations, 0, 8) as $conversation) {
            foreach ($agents as $agent) {
                Notification::factory()->create([
                    'account_id' => $account->id,
                    'user_id' => $agent->id,
                    'primary_actor_type' => $conversation->getMorphClass(),
                    'primary_actor_id' => $conversation->id,
                ]);
            }
        }

        return new self($account, $admin, $agents, $inbox, $conversations, $conversations[0]);
    }

    private static function conversationWithHistory(Account $account, Inbox $inbox, User $assignee, int $index): Conversation
    {
        $threadId = (string) (8800000000000000 + $index);
        $contact = Contact::factory()->create(['account_id' => $account->id, 'name' => "Khách {$index}", 'phone_number' => '+8490'.str_pad((string) $index, 7, '0', STR_PAD_LEFT)]);
        $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id, 'source_id' => $threadId]);
        $conversation = Conversation::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contact->id,
            'contact_inbox_id' => $contactInbox->id,
            'assignee_id' => $assignee->id,
            'additional_attributes' => ['thread_id' => $threadId, 'thread_type' => 0],
        ]);

        foreach (range(1, self::MESSAGES_PER_CONVERSATION) as $position) {
            $incoming = $position % 2 === 1;
            $message = Message::factory()->create([
                'account_id' => $account->id,
                'inbox_id' => $inbox->id,
                'conversation_id' => $conversation->id,
                'message_type' => $incoming ? Message::TYPE_INCOMING : Message::TYPE_OUTGOING,
                'sender_type' => $incoming ? 'Contact' : 'User',
                'sender_id' => $incoming ? $contact->id : $assignee->id,
                'source_id' => "zalo-{$index}-{$position}",
                'content' => $position % 3 === 0 ? null : "Tin thứ {$position}",
                'created_at' => now()->subMinutes(self::MESSAGES_PER_CONVERSATION - $position),
            ]);

            if ($position % 3 === 0) {
                $message->attachments()->create([
                    'account_id' => $account->id,
                    'file_type' => $position % 2 === 0 ? Attachment::FILE_TYPE_IMAGE : Attachment::FILE_TYPE_FILE,
                    'path' => "attachments/{$conversation->id}/{$position}.jpg",
                    'filename' => "{$position}.jpg",
                    'content_type' => $position % 2 === 0 ? 'image/jpeg' : 'application/pdf',
                    'byte_size' => 20480,
                ]);
            }
        }

        return $conversation;
    }
}
