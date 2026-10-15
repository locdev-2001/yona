<?php

namespace Tests\Feature\Agent\Runtime;

use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\Runtime\Jobs\RunTurnJob;
use App\Agent\Runtime\TurnSettings;
use App\Builders\Messages\MessageBuilder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AiAgent;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\AiAgents\AiAgentService;
use App\Services\Conversations\ConversationAutoResponder;
use Illuminate\Support\Facades\Bus;
use Throwable;

// Dựng hội thoại đang tự động với AI của inbox, tin khách thật qua đường tạo tin của
// lõi, và chạy job lượt như worker (handle, lỗi thì failed). Job lượt bị giữ lại bằng
// Bus::fake để test tự quyết lúc chạy, còn mọi job khác chạy thật.
final class TurnKit
{
    /** @var array<int, true> */
    private static array $ran = [];

    // Bật lượt tường minh: .env của máy dev có thể tắt lượt AI cho các test khác.
    public static function boot(): void
    {
        self::$ran = [];
        config(['agent.turn.enabled' => true]);
        app()->forgetInstance(TurnSettings::class);
        Bus::fake([RunTurnJob::class]);
    }

    public static function model(array $steps): ScriptedLanguageModel
    {
        $model = new ScriptedLanguageModel($steps);
        app()->instance(LanguageModel::class, $model);

        return $model;
    }

    /** @return array{conversation: Conversation, aiAgent: AiAgent, staff: User, contact: Contact} */
    public static function autoConversation(?Account $account = null, string $agentName = 'Lan', ?string $persona = 'Xưng em, gọi khách là anh/chị.', ?string $instructions = 'Shop Áo Đẹp bán áo thun.'): array
    {
        $account ??= Account::factory()->create();
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
        $conversation = Conversation::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contact->id,
            'contact_inbox_id' => $contactInbox->id,
        ]);
        $staff = User::factory()->create(['name' => 'Minh']);
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $staff->id, 'role' => AccountUser::ROLE_AGENT]);
        $inbox->addMembers([$staff->id]);

        $service = app(AiAgentService::class);
        $aiAgent = $service->create($account, $agentName, $persona, $instructions);
        $service->assignInbox($inbox, $aiAgent);
        app(ConversationAutoResponder::class)->enable($conversation->fresh());

        return ['conversation' => $conversation->fresh(), 'aiAgent' => $aiAgent, 'staff' => $staff, 'contact' => $contact];
    }

    public static function customerSays(Conversation $conversation, string $text): Message
    {
        $message = Message::factory()->make([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'message_type' => Message::TYPE_INCOMING,
            'content' => $text,
        ]);
        $message->sender()->associate($conversation->contact);
        $message->save();

        return $message;
    }

    public static function staffSays(Conversation $conversation, User $staff, string $text, bool $private = false): Message
    {
        return (new MessageBuilder($staff, $conversation->fresh(), ['content' => $text, 'private' => $private]))->perform();
    }

    // Chủ shop trả lời thẳng trên ứng dụng của kênh: tin đi không người gửi, mang dấu echo.
    public static function ownerEchoes(Conversation $conversation, string $text): Message
    {
        return Message::factory()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => $text,
            'content_attributes' => ['external_echo' => true],
        ]);
    }

    /** @return list<RunTurnJob> */
    public static function pendingTurns(): array
    {
        return Bus::dispatched(RunTurnJob::class)
            ->reject(fn (RunTurnJob $job) => isset(self::$ran[spl_object_id($job)]))
            ->values()
            ->all();
    }

    // Chạy mọi job lượt đang chờ theo thứ tự xếp hàng, như worker: lỗi thì gọi failed().
    public static function runPendingTurns(): int
    {
        $ran = 0;

        foreach (self::pendingTurns() as $job) {
            self::$ran[spl_object_id($job)] = true;
            $ran++;

            try {
                app()->call([$job, 'handle']);
            } catch (Throwable $exception) {
                $job->failed($exception);
            }
        }

        return $ran;
    }

    /** @return list<Message> tin công khai AI gửi cho khách */
    public static function aiReplies(Conversation $conversation): array
    {
        return Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_type', (new AiAgent)->getMorphClass())
            ->where('private', false)
            ->orderBy('id')
            ->get()
            ->all();
    }

    /** @return list<Message> */
    public static function aiNotes(Conversation $conversation): array
    {
        return Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_type', (new AiAgent)->getMorphClass())
            ->where('private', true)
            ->orderBy('id')
            ->get()
            ->all();
    }
}
