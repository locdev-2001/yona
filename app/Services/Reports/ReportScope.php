<?php

namespace App\Services\Reports;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Message;
use App\Models\ReportingEvent;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Gom `ReportHelper#scope` + các quan hệ `conversations/messages/reporting_events`
 * mà Chatwoot rải trên Account/Inbox/User/Label/Team về một chỗ: chiều báo cáo
 * nào cũng chỉ nói chuyện qua ba truy vấn này, thêm chiều mới = thêm một nhánh.
 */
final class ReportScope
{
    public const TYPE_ACCOUNT = 'account';

    public const TYPE_INBOX = 'inbox';

    public const TYPE_AGENT = 'agent';

    public const TYPE_LABEL = 'label';

    public const TYPE_TEAM = 'team';

    public const TYPES = [self::TYPE_ACCOUNT, self::TYPE_INBOX, self::TYPE_AGENT, self::TYPE_LABEL, self::TYPE_TEAM];

    private function __construct(
        private readonly Account $account,
        private readonly string $type,
        private readonly ?Model $subject,
    ) {}

    public static function for(Account $account, ?string $type, mixed $id = null): self
    {
        $type = blank($type) ? self::TYPE_ACCOUNT : (string) $type;

        $subject = match ($type) {
            self::TYPE_INBOX => $account->inboxes()->findOrFail($id),
            self::TYPE_AGENT => $account->users()->findOrFail($id),
            self::TYPE_LABEL => $account->labels()->findOrFail($id),
            self::TYPE_TEAM => $account->teams()->findOrFail($id),
            self::TYPE_ACCOUNT => null,
            default => throw new \InvalidArgumentException("Unsupported report dimension type: {$type}"),
        };

        return new self($account, $type, $subject);
    }

    public function type(): string
    {
        return $this->type;
    }

    public function subject(): ?Model
    {
        return $this->subject;
    }

    /** @return Builder<Conversation> */
    public function conversations(): Builder
    {
        $query = Conversation::query()->where('conversations.account_id', $this->account->id);

        return match ($this->type) {
            self::TYPE_INBOX => $query->where('conversations.inbox_id', $this->subjectId()),
            self::TYPE_AGENT => $query->where('conversations.assignee_id', $this->subjectId()),
            self::TYPE_TEAM => $query->where('conversations.team_id', $this->subjectId()),
            self::TYPE_LABEL => $query->whereIn('conversations.id', $this->labelConversationIds()),
            default => $query,
        };
    }

    /** @return Builder<Message> */
    public function messages(): Builder
    {
        $query = Message::query()->where('messages.account_id', $this->account->id);

        return match ($this->type) {
            self::TYPE_INBOX => $query->where('messages.inbox_id', $this->subjectId()),
            self::TYPE_AGENT => $query->where('messages.sender_type', 'User')->where('messages.sender_id', $this->subjectId()),
            self::TYPE_TEAM, self::TYPE_LABEL => $query->whereIn('messages.conversation_id', $this->conversationIdsSubquery()),
            default => $query,
        };
    }

    /** @return Builder<ReportingEvent> */
    public function reportingEvents(): Builder
    {
        $query = ReportingEvent::query()->where('reporting_events.account_id', $this->account->id);

        return match ($this->type) {
            self::TYPE_INBOX => $query->where('reporting_events.inbox_id', $this->subjectId()),
            self::TYPE_AGENT => $query->where('reporting_events.user_id', $this->subjectId()),
            self::TYPE_TEAM, self::TYPE_LABEL => $query->whereIn('reporting_events.conversation_id', $this->conversationIdsSubquery()),
            default => $query,
        };
    }

    private function subjectId(): int
    {
        return (int) $this->subject?->getKey();
    }

    /** @return \Illuminate\Database\Query\Builder */
    private function conversationIdsSubquery()
    {
        return $this->conversations()->select('conversations.id')->toBase();
    }

    /** @return \Illuminate\Database\Query\Builder */
    private function labelConversationIds()
    {
        /** @var Label $label */
        $label = $this->subject;

        return DB::table('taggings')
            ->where('taggable_type', (new Conversation)->getMorphClass())
            ->where('label_id', $label->id)
            ->select('taggable_id');
    }

    /** @return Inbox|User|Label|Team|Account */
    public function subjectOrAccount(): Model
    {
        return $this->subject ?? $this->account;
    }
}
