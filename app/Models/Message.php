<?php

namespace App\Models;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Events\PreviousChanges;
use App\Exceptions\MessageValidationException;
use App\Messaging\Delivery\OutboundOrder;
use App\Messaging\Reactions\ReactionEmoji;
use App\Models\Concerns\IndexedForSearch;
use App\Models\Concerns\SharesRequestModels;
use App\Services\Messages\InReplyToMessageBuilder;
use App\Services\Messages\OutboundMentionsBuilder;
use App\Services\MessageTemplates\HookExecutionService;
use App\Support\CurrentExecutedBy;
use App\Support\LiquidTemplate;
use App\Support\MessageDrops;
use App\Support\Messages\OutgoingText;
use Database\Factories\MessageFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\DB;

// Bỏ: agent bot/captain (EE), searchkick (EE), translations (F6).
class Message extends Model
{
    /** @use HasFactory<MessageFactory> */
    use HasFactory, IndexedForSearch, SharesRequestModels;

    public const TYPE_INCOMING = 0;

    public const TYPE_OUTGOING = 1;

    public const TYPE_ACTIVITY = 2;

    public const TYPE_TEMPLATE = 3;

    public const MESSAGE_TYPES = [
        'incoming' => self::TYPE_INCOMING,
        'outgoing' => self::TYPE_OUTGOING,
        'activity' => self::TYPE_ACTIVITY,
        'template' => self::TYPE_TEMPLATE,
    ];

    public const CONTENT_TYPES = [
        'text' => 0,
        'input_text' => 1,
        'input_textarea' => 2,
        'input_email' => 3,
        'input_select' => 4,
        'cards' => 5,
        'form' => 6,
        'article' => 7,
        'incoming_email' => 8,
        'input_csat' => 9,
        'integrations' => 10,
        'sticker' => 11,
        'voice_call' => 12,
        // Tin có cấu trúc (app/Messaging/Structured). Số chỉ cộng thêm, không đổi.
        'buttons' => 13,
        'order_status' => 14,
        'bank_transfer' => 15,
        'order_request' => 16,
        'webview' => 17,
    ];

    public const STATUSES = [
        'sent' => 0,
        'delivered' => 1,
        'read' => 2,
        'failed' => 3,
    ];

    public const MAX_CONTENT_LENGTH = 150000;

    /** `by` của biểu cảm lưu theo hình dạng cũ (mảng emoji phẳng, không biết ai thả). */
    public const REACTION_BY_UNKNOWN = 'unknown';

    /** Tiền tố `by` khi chính agent thả biểu cảm (§2.3 `content_attributes.reactions[].by`). */
    public const REACTION_BY_AGENT_PREFIX = 'agent:';

    public const NUMBER_OF_PERMITTED_ATTACHMENTS = 15;

    // Transient như attr_accessor :echo_id — FE gửi kèm để tự khớp bản nháp.
    public ?string $echoId = null;

    // Tương đương has_many :attachments, autosave: true — builder gán tệp đã
    // dựng, model lưu ngay trong lượt tạo để payload realtime đã có attachments.
    /** @var list<Attachment> */
    public array $pendingAttachments = [];

    // Có giá trị khi đây là bản trình bày (seenFrom) của tin luồng dùng chung, không lưu được.
    public ?Conversation $presentedIn = null;

    // Default DB chưa có trên model mới tạo — set sẵn cho serializer.
    protected $attributes = [
        'status' => 0,
        'private' => false,
    ];

    protected $fillable = [
        'account_id',
        'inbox_id',
        'conversation_id',
        'content',
        'message_type',
        'private',
        'status',
        'source_id',
        'platform_sent_at',
        'content_type',
        'content_attributes',
        'sender_type',
        'sender_id',
        'external_source_ids',
        'additional_attributes',
    ];

    protected function casts(): array
    {
        return [
            'private' => 'boolean',
            'platform_sent_at' => 'datetime',
            'content_attributes' => 'array',
            'external_source_ids' => 'array',
            'additional_attributes' => 'array',
            'sentiment' => 'array',
        ];
    }

    /**
     * Tin của hội thoại gốc nhìn từ dòng riêng của một thành viên: mang id hội thoại,
     * account, hộp thư của dòng đó, và tin người khác gửi đi thành tin đến với người xem.
     *
     * @param  array{external_id: string, name: string, avatar: string, avatar_seed: string}|null  $groupSender
     */
    public function seenFrom(Conversation $view, ?int $viewerId, ?array $groupSender = null): self
    {
        $sentByViewer = $this->sender_type === (new User)->getMorphClass() && (int) $this->sender_id === $viewerId;

        $copy = clone $this;
        $copy->presentedIn = $view;
        $copy->setRawAttributes([
            ...$this->getAttributes(),
            'account_id' => $view->account_id,
            'inbox_id' => $view->inbox_id,
            'conversation_id' => $view->id,
            'message_type' => $this->message_type === self::TYPE_OUTGOING && ! $sentByViewer ? self::TYPE_INCOMING : $this->message_type,
        ], true);
        if ($groupSender !== null) {
            $copy->content_attributes = [...($this->content_attributes ?? []), 'sender' => $groupSender];
        }
        $copy->setRelation('conversation', $view);
        $copy->unsetRelation('account');
        $copy->unsetRelation('inbox');

        return $copy;
    }

    private function assertNotPresentation(): void
    {
        if ($this->presentedIn !== null) {
            throw new \LogicException('A presented thread message is read-only; change the stored message instead.');
        }
    }

    public static function typeName(int $messageType): string
    {
        return array_flip(self::MESSAGE_TYPES)[$messageType];
    }

    public static function typeFromName(string $name): ?int
    {
        return self::MESSAGE_TYPES[$name] ?? null;
    }

    public static function contentTypeFromName(?string $name): ?int
    {
        return $name === null ? null : (self::CONTENT_TYPES[$name] ?? null);
    }

    protected static function booted(): void
    {
        static::creating(function (Message $message) {
            // ensure_content_type + prevent_message_flooding + Liquidable#process_liquid_in_content.
            $message->content_type ??= self::CONTENT_TYPES['text'];
            // Tin tạo trong Yona (agent, bot, widget) gửi đúng lúc tạo; driver kênh đặt
            // giờ nền tảng trước khi lưu. Cột không bao giờ rỗng để thứ tự sắp theo nó.
            $message->platform_sent_at ??= $message->created_at ?? $message->freshTimestamp();
            $message->preventMessageFlooding();
            $message->renderContentVariables();
            // Neo sau Liquid: biến đổi độ dài nội dung thì vị trí nhắc tên mới đúng.
            (new OutboundMentionsBuilder($message))->perform();
        });

        static::saving(function (Message $message) {
            $message->assertNotPresentation();
            $message->validateContentLength();
            $message->ensureInReplyTo();
            $message->ensureProcessedMessageContent();
        });

        static::deleting(function (Message $message) {
            $message->assertNotPresentation();
            // has_many :attachments, dependent: :destroy — xóa từng bản ghi để
            // hook deleted của Attachment dọn luôn tệp trên đĩa.
            $message->attachments->each->delete();
        });

        static::created(function (Message $message) {
            // autosave attachments chạy trong chính lượt save! của Rails —
            // phải xong trước mọi after_create_commit bên dưới.
            $message->persistPendingAttachments();

            // execute_after_create_commit_callbacks: gốc là `after_create_commit`,
            // tức CHẠY SAU KHI transaction ngoài cùng commit. Builder Facebook /
            // Instagram và hai mailbox bọc cả cụm "tạo tin + gắn đính kèm" trong
            // một transaction — phát sự kiện ngay trong hook `created` thì
            // `message.created` bay đi lúc đính kèm chưa tồn tại, và một lần
            // rollback sau đó để lại tin "ma" trên giao diện.
            // afterCommit chạy ngay lập tức khi không có transaction nào đang mở,
            // nên các kênh không bọc transaction giữ nguyên hành vi cũ.
            $message->getConnection()->afterCommit(function () use ($message) {
                $message->sendReply();
                $message->reopenConversation();
                $message->setConversationActivity();
                $message->dispatchCreateEvents();
                $message->executeMessageTemplateHooks();
                $message->updateContactActivity();
            });
        });

        static::updated(function (Message $message) {
            $message->sendUpdateEvent();
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): MorphTo
    {
        return $this->morphTo();
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function csatSurveyResponse(): HasOne
    {
        return $this->hasOne(CsatSurveyResponse::class);
    }

    /**
     * Tin bị xoá/thu hồi — MỘT chỗ duy nhất cho cả hai chiều: agent bấm xoá trong
     * dashboard và kênh báo khách đã thu hồi (docs/channel-capabilities.md §2.3
     * `event_recall`). Port từ messages_controller.rb#destroy của bản gốc:
     * nội dung thay bằng chuỗi dịch, content_type về text, content_attributes chỉ
     * còn `deleted`, và `attachments.destroy_all` — hook `deleted` của Attachment
     * xoá luôn tệp trên đĩa nên ảnh đã thu hồi biến khỏi cả tab Media/Files.
     */
    public function markDeleted(?string $locale = null): void
    {
        DB::transaction(function () use ($locale) {
            // Gỡ tệp trước update(): sự kiện message.updated dựng payload ngay trong
            // hook `updated`, còn giữ tệp thì agent đang mở hội thoại nhận ô ảnh trỏ
            // vào tệp sắp bị xoá.
            $this->attachments()->get()->each->delete();
            $this->setRelation('attachments', $this->attachments()->getRelated()->newCollection());

            $this->update([
                'content' => __('conversations.messages.deleted', [], $locale),
                'content_type' => self::CONTENT_TYPES['text'],
                'content_attributes' => ['deleted' => true],
            ]);
        });
    }

    public function isDeleted(): bool
    {
        return ($this->content_attributes['deleted'] ?? false) === true;
    }

    /** Agent chuyển tiếp trong Yona, hoặc khách chuyển tiếp trên nền tảng (`content_attributes.forwarded_from`). */
    public function isForwarded(): bool
    {
        return is_array($this->content_attributes['forwarded_from'] ?? null);
    }

    /**
     * Tin mà tin này trả lời trích dẫn. Chỉ tra trong cùng hội thoại: `in_reply_to`
     * do client gửi lên, trỏ sang hội thoại khác thì coi như không có. Driver kênh
     * cần nguyên tin gốc (ảnh chụp nền tảng, Message-ID thư) đều đi qua đây.
     */
    public function repliedMessage(): ?self
    {
        $repliedId = $this->content_attributes['in_reply_to'] ?? null;

        if (! is_numeric($repliedId) || $this->conversation_id === null) {
            return null;
        }

        return self::query()
            ->where('conversation_id', $this->conversation_id)
            ->whereKey((int) $repliedId)
            ->first();
    }

    /**
     * Biểu cảm theo chuẩn §2.3: `[{emoji, by, at}]` — `by` là định danh người thả
     * (`external_id` của khách, `agent:<id>` khi chính agent thả). Bản ghi cũ lưu
     * mảng emoji phẳng (không biết ai thả); nâng cấp ngay tại chỗ đọc để không cần
     * migration dữ liệu và để mọi nơi chỉ thấy một hình dạng.
     *
     * @return list<array{emoji: string, by: string, at: int}>
     */
    public function reactionList(): array
    {
        $stored = $this->content_attributes['reactions'] ?? [];

        if (! is_array($stored)) {
            return [];
        }

        $reactions = [];

        foreach ($stored as $entry) {
            if (is_string($entry) && $entry !== '') {
                $reactions[] = ['emoji' => ReactionEmoji::normalize($entry), 'by' => self::REACTION_BY_UNKNOWN, 'at' => 0];

                continue;
            }

            if (is_array($entry) && filled($entry['emoji'] ?? null)) {
                $reactions[] = [
                    'emoji' => ReactionEmoji::normalize((string) $entry['emoji']),
                    'by' => (string) ($entry['by'] ?? self::REACTION_BY_UNKNOWN),
                    'at' => (int) ($entry['at'] ?? 0),
                ];
            }
        }

        return $reactions;
    }

    /**
     * Một người chỉ giữ MỘT biểu cảm trên một tin (đúng cách Zalo/Messenger làm):
     * thả cái mới thay cái cũ của chính người đó, không cộng dồn; người này gỡ
     * không đụng biểu cảm của người kia. `$emoji = null` là gỡ. Trả về true khi
     * danh sách thực sự đổi.
     */
    public function setReaction(string $by, ?string $emoji): bool
    {
        $emoji = ReactionEmoji::normalize($emoji);
        $current = $this->reactionList();
        $slot = self::reactionActorSlot($by);
        $held = null;

        foreach ($current as $entry) {
            if (self::reactionActorSlot($entry['by']) === $slot) {
                $held = $entry['emoji'];
            }
        }

        // Thả lại đúng biểu cảm đang giữ (hoặc gỡ khi chưa có gì) = không đổi gì:
        // giữ nguyên bản ghi để tin dội lại từ kênh không sinh sự kiện realtime thừa.
        if ($held === $emoji || ($emoji === '' && $held === null)) {
            return false;
        }

        $next = array_values(array_filter(
            $current,
            fn (array $entry) => self::reactionActorSlot($entry['by']) !== $slot,
        ));

        if ($emoji !== null && $emoji !== '') {
            $next[] = ['emoji' => $emoji, 'by' => $by, 'at' => now()->getTimestamp()];
        }

        $this->update(['content_attributes' => [...$this->content_attributes ?? [], 'reactions' => $next]]);

        return true;
    }

    /**
     * Mọi biểu cảm phát ra từ phía tenant (agent bấm trong Yona, hoặc chủ shop thả
     * trên chính ứng dụng của kênh rồi dội về) chiếm CÙNG một ô — nếu không thì
     * một lần thả sẽ hiện thành hai.
     */
    private static function reactionActorSlot(string $by): string
    {
        return str_starts_with($by, self::REACTION_BY_AGENT_PREFIX) ? 'agent' : $by;
    }

    // validate_attachments_limit (before_add) — chặn trước khi thêm tệp thứ 16.
    public static function guardAttachmentsLimit(int $currentCount): void
    {
        $limit = (int) config('limits.number_of_permitted_attachments', self::NUMBER_OF_PERMITTED_ATTACHMENTS);

        if ($currentCount >= $limit) {
            throw new MessageValidationException('Attachments exceeded maximum allowed');
        }
    }

    /**
     * Nội dung gửi ra kênh, đúng định dạng chữ kênh khai. Mọi driver gửi đi đọc
     * qua đây thay vì `content`; bản lưu và hộp thư vẫn là markdown.
     */
    public function outgoingContent(): ?string
    {
        return OutgoingText::render($this->content, $this->inbox->capabilities()->textFormat());
    }

    // Loại không còn trong bảng (dữ liệu cũ) hiện như chữ, để một tin lạ không làm hỏng cả hội thoại.
    public function contentTypeName(): string
    {
        return array_flip(self::CONTENT_TYPES)[$this->content_type] ?? 'text';
    }

    public function statusName(): ?string
    {
        return $this->status === null ? null : array_flip(self::STATUSES)[$this->status];
    }

    public function isIncoming(): bool
    {
        return $this->message_type === self::TYPE_INCOMING;
    }

    public function isOutgoing(): bool
    {
        return $this->message_type === self::TYPE_OUTGOING;
    }

    // MessageFilterHelpers#webhook_sendable? — activity/private không gửi ra ngoài.
    public function isWebhookSendable(): bool
    {
        return in_array($this->message_type, [self::TYPE_INCOMING, self::TYPE_OUTGOING, self::TYPE_TEMPLATE], true);
    }

    public function isInputCsat(): bool
    {
        return $this->content_type === self::CONTENT_TYPES['input_csat'];
    }

    // MessageFilterHelpers#conversation_transcriptable? / #email_reply_summarizable?
    // Message#send_reply — đẩy tin ra kênh ngoài; SendReplyJob chọn driver.
    // Gửi ngay, không trễ: tệp đính kèm đã nằm trên đĩa từ lúc builder dựng tin,
    // trước khi tin được lưu — không còn gì phải chờ.
    private function sendReply(): void
    {
        app(OutboundOrder::class)->dispatch($this);
    }

    public function isConversationTranscriptable(): bool
    {
        return $this->isIncoming() || $this->isOutgoing();
    }

    public function isEmailReplySummarizable(): bool
    {
        return $this->isIncoming() || $this->isOutgoing() || $this->isInputCsat();
    }

    // Message#email_notifiable_message? — tin nào được phép chuyển thành thư đi.
    public function isEmailNotifiableMessage(): bool
    {
        if ($this->private || ! in_array($this->message_type, [self::TYPE_OUTGOING, self::TYPE_TEMPLATE], true)) {
            return false;
        }

        return $this->message_type !== self::TYPE_TEMPLATE
            || in_array($this->content_type, [self::CONTENT_TYPES['input_csat'], self::CONTENT_TYPES['text']], true);
    }

    public function isAutoReplyEmail(): bool
    {
        if ($this->content_type !== self::CONTENT_TYPES['incoming_email'] && ! $this->inbox->isEmail()) {
            return false;
        }

        return data_get($this->content_attributes, 'email.auto_reply') === true;
    }

    public function scopeChat(Builder $query): Builder
    {
        return $query->where('message_type', '!=', self::TYPE_ACTIVITY)->where('private', false);
    }

    public function scopeIncoming(Builder $query): Builder
    {
        return $query->where('message_type', self::TYPE_INCOMING);
    }

    public function scopeOutgoing(Builder $query): Builder
    {
        return $query->where('message_type', self::TYPE_OUTGOING);
    }

    public function scopeTemplate(Builder $query): Builder
    {
        return $query->where('message_type', self::TYPE_TEMPLATE);
    }

    // scope :today — so theo NGÀY của lịch, không phải 24 giờ gần nhất.
    public function scopeToday(Builder $query): Builder
    {
        return $query->whereRaw("date_trunc('day', created_at) = ?", [now()->startOfDay()]);
    }

    private function persistPendingAttachments(): void
    {
        if ($this->pendingAttachments === []) {
            return;
        }

        foreach ($this->pendingAttachments as $attachment) {
            $this->attachments()->save($attachment);
        }

        $this->setRelation('attachments', collect($this->pendingAttachments));
        $this->pendingAttachments = [];
    }

    private function preventMessageFlooding(): void
    {
        if ($this->conversation_id === null || $this->conversation === null) {
            return;
        }

        $limit = (int) config('limits.conversation_message_per_minute');

        $recentCount = $this->conversation->messages()
            ->where('created_at', '>=', now()->subMinute())
            ->count();

        if ($recentCount >= $limit) {
            throw new MessageValidationException('Too many messages');
        }
    }

    private function validateContentLength(): void
    {
        foreach (['content', 'processed_message_content'] as $attribute) {
            $value = $this->getAttribute($attribute);

            if ($value !== null && mb_strlen($value) > self::MAX_CONTENT_LENGTH) {
                throw new MessageValidationException(
                    ucfirst(str_replace('_', ' ', $attribute)).' is too long (maximum is 150000 characters)'
                );
            }
        }
    }

    // Liquidable#process_liquid_in_content: chỉ tin agent gửi ra và tin mẫu mới
    // được tham chiếu biến — tin của khách giữ nguyên văn. Tin chuyển tiếp mang
    // nguyên văn một tin đã có, nên chuỗi `{{…}}` trong đó không phải biến.
    private function renderContentVariables(): void
    {
        if (blank($this->content) || $this->isForwarded()
            || ! in_array($this->message_type, [self::TYPE_OUTGOING, self::TYPE_TEMPLATE], true)) {
            return;
        }

        $this->content = LiquidTemplate::render($this->content, MessageDrops::forMessage($this));
    }

    private function executeMessageTemplateHooks(): void
    {
        (new HookExecutionService($this))->perform();
    }

    /** before_save :ensure_in_reply_to —.rb:310. */
    private function ensureInReplyTo(): void
    {
        (new InReplyToMessageBuilder(
            message: $this,
            inReplyTo: $this->content_attributes['in_reply_to'] ?? null,
            inReplyToExternalId: $this->content_attributes['in_reply_to_external_id'] ?? null,
        ))->perform();
    }

    private function ensureProcessedMessageContent(): void
    {
        $email = $this->content_attributes['email'] ?? [];
        $messageContent = data_get($email, 'text_content.quoted')
            ?? data_get($email, 'html_content.quoted')
            ?? $this->content;

        $this->processed_message_content = $messageContent === null
            ? null
            : self::truncateLikeRails($messageContent);
    }

    private static function truncateLikeRails(string $value): string
    {
        if (mb_strlen($value) <= self::MAX_CONTENT_LENGTH) {
            return $value;
        }

        return mb_substr($value, 0, self::MAX_CONTENT_LENGTH - 3).'...';
    }

    private function reopenConversation(): void
    {
        if ($this->isIncoming()) {
            $this->conversation->reopenForNewMessage();
        }
    }

    // Dòng hệ thống (gán người, đổi nhãn, đổi trạng thái) không phải tin mới:
    // để nó chạm last_activity_at là hội thoại cũ nổi lên đầu danh sách như vừa có thư.
    private function setConversationActivity(): void
    {
        if ($this->message_type === self::TYPE_ACTIVITY) {
            return;
        }

        // update_columns: không chạy hook, updated_at đổi theo thời điểm hiện tại. Dòng riêng
        // của mọi thành viên luồng dùng chung nhảy lên đầu danh sách cùng lúc.
        $this->conversation->newModelQuery()
            ->where(fn (Builder $rows) => $rows->whereKey($this->conversation_id)->orWhere('thread_conversation_id', $this->conversation_id))
            ->toBase()
            ->update([
                'last_activity_at' => $this->created_at,
                'updated_at' => now(),
            ]);
        $this->conversation->setAttribute('last_activity_at', $this->created_at);
        $this->conversation->syncOriginalAttribute('last_activity_at');
    }

    // dispatch_create_events + update_waiting_since.
    private function dispatchCreateEvents(): void
    {
        $conversation = $this->conversation;

        DomainEvent::dispatch(EventType::MESSAGE_CREATED, ['message' => $this, 'performed_by' => CurrentExecutedBy::get() ?? auth()->user()]);

        if ($this->isValidFirstReply()) {
            DomainEvent::dispatch(EventType::FIRST_REPLY_CREATED, ['message' => $this, 'performed_by' => CurrentExecutedBy::get() ?? auth()->user()]);
            $conversation->update(['first_reply_created_at' => $this->created_at, 'waiting_since' => null]);

            return;
        }

        if ($conversation->waiting_since !== null && ! $this->private && $this->isHumanResponse()) {
            // Bắn TRƯỚC khi xóa mốc chờ — reply_time đo từ chính mốc đó (D2).
            DomainEvent::dispatch(EventType::REPLY_CREATED, ['message' => $this, 'waiting_since' => $conversation->waiting_since]);
            $conversation->update(['waiting_since' => null]);
        }

        if ($this->isIncoming() && $conversation->waiting_since === null) {
            $conversation->update(['waiting_since' => $this->created_at]);
        }
    }

    // Eloquent chỉ bắn `updated` khi có cột đổi — tương đương guard
    // previous_changes.blank? của dispatch_update_event.
    private function sendUpdateEvent(): void
    {
        DomainEvent::dispatch(EventType::MESSAGE_UPDATED, [
            'message' => $this,
            'performed_by' => CurrentExecutedBy::get() ?? auth()->user(),
            'previous_changes' => PreviousChanges::of($this),
        ]);
    }

    private function isValidFirstReply(): bool
    {
        if (! $this->isHumanResponse() || $this->private) {
            return false;
        }

        if ($this->conversation->first_reply_created_at !== null) {
            return false;
        }

        $priorOutgoingCount = $this->conversation->messages()
            ->outgoing()
            ->where(fn (Builder $query) => $query->whereNull('sender_type')->orWhere('sender_type', '!=', 'AgentBot'))
            ->where('private', false)
            ->whereRaw("(additional_attributes->'campaign_id') is null")
            ->count();

        return $priorOutgoingCount <= 1;
    }

    private function isHumanResponse(): bool
    {
        return $this->isOutgoing()
            && blank($this->content_attributes['automation_rule_id'] ?? null)
            && blank($this->additional_attributes['campaign_id'] ?? null)
            && ($this->sender instanceof User || filled($this->content_attributes['external_echo'] ?? null));
    }

    private function updateContactActivity(): void
    {
        if ($this->sender instanceof Contact) {
            $this->sender->update(['last_activity_at' => now()]);
        }
    }
}
