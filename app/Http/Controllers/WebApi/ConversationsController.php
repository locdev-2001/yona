<?php

namespace App\Http\Controllers\WebApi;

use App\Builders\ContactInboxBuilder;
use App\Builders\ConversationBuilder;
use App\Builders\Messages\MessageBuilder;
use App\Channels\Capability;
use App\Events\DomainEvent;
use App\Events\EventType;
use App\Exceptions\CustomFilterException;
use App\Exceptions\MessageValidationException;
use App\Finders\ConversationFinder;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Channels\ChannelActionRegistry;
use App\Services\Conversations\FilterService;
use App\Services\Conversations\TypingStatusManager;
use App\Services\Conversations\UnreadCounts\Counter as UnreadCountsCounter;
use App\Services\Notification\MarkConversationReadService;
use App\Support\BooleanParam;
use App\Support\DateRangeHelper;
use Carbon\CarbonInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

// Port từ Api::V1::Accounts::ConversationsController của Chatwoot.
// Bỏ: search (E2), transcript (F1),
// destroy (đi cùng DeleteService các nhóm sau),
// bot_handoff (AgentBot chưa port).
class ConversationsController extends Controller
{
    private const ATTACHMENT_RESULTS_PER_PAGE = 15;

    private const LINK_MESSAGES_PER_PAGE = 20;

    // Tin có thể chứa liên kết; giao diện tách từng liên kết bằng đúng bộ linkify
    // của khung chat, nên ở đây chỉ cần lọc thô cho gọn trang.
    private const LINK_CANDIDATE_PATTERN = '(https?://|www\.)';

    private const UNREAD_COUNTS_FEATURE = 'conversation_unread_counts';

    public function index(Request $request, Account $account): JsonResponse
    {
        $result = $this->finder($request, $account)->perform();

        return response()->json([
            'data' => [
                'meta' => $result['count'],
                'payload' => ConversationResource::collectionFor($result['conversations']),
            ],
        ]);
    }

    public function filter(Request $request, Account $account): JsonResponse
    {
        $validated = $request->validate([
            'payload' => ['required', 'array', 'min:1', 'max:20'],
            'payload.*' => ['required', 'array'],
        ]);
        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        try {
            $result = (new FilterService(
                $request->user(),
                $account,
                $accountUser,
                $validated['payload'],
                (int) $request->query('page', '1'),
            ))->perform();
        } catch (CustomFilterException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'data' => [
                'meta' => $result['count'],
                'payload' => ConversationResource::collectionFor($result['conversations']),
            ],
        ]);
    }

    // conversations#attachments: mọi tệp của hội thoại, mới nhất trước, phân trang.
    public function attachments(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        $kindFileTypes = Attachment::SHARED_KIND_FILE_TYPES[$request->query('kind')] ?? null;

        $attachments = Attachment::query()
            ->whereMorphedTo('attachable', Message::class)
            ->whereIn('attachable_id', $conversation->messages()->select('id'))
            ->when($kindFileTypes !== null, fn ($query) => $query->whereIn('file_type', $kindFileTypes))
            ->with('attachable')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(self::ATTACHMENT_RESULTS_PER_PAGE, ['*'], 'page', (int) $request->query('page', '1'));

        return response()->json([
            'meta' => ['total_count' => $attachments->total()],
            'payload' => collect($attachments->items())
                ->map(fn (Attachment $attachment) => [...$attachment->apiData(), 'filename' => $attachment->displayName()])
                ->values()
                ->all(),
        ]);
    }

    // Mục "Liên kết" ở panel hội thoại: tin có liên kết, mới trước, theo trang —
    // không phụ thuộc phần tin khung chat đã tải.
    public function links(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        $messages = $conversation->messagesNewestFirst()
            ->where('message_type', '!=', Message::TYPE_ACTIVITY)
            ->where('content', '~*', self::LINK_CANDIDATE_PATTERN)
            ->simplePaginate(self::LINK_MESSAGES_PER_PAGE, ['id', 'content', 'created_at'], 'page', (int) $request->query('page', '1'));

        return response()->json([
            'meta' => ['has_more' => $messages->hasMorePages()],
            'payload' => collect($messages->items())
                ->map(fn (Message $message) => [
                    'message_id' => $message->id,
                    'content' => $message->content,
                    'created_at' => $message->created_at?->timestamp,
                ])
                ->values()
                ->all(),
        ]);
    }

    public function meta(Request $request, Account $account): JsonResponse
    {
        $result = $this->finder($request, $account)->performMetaOnly();

        return response()->json(['meta' => $result['count']]);
    }

    // conversations/unread_counts#index — badge sidebar. Cùng cổng cờ tính năng như
    // bản gốc: account chưa bật 'conversation_unread_counts' thì 403.
    public function unreadCounts(Request $request, Account $account): JsonResponse
    {
        if (! $account->featureEnabled(self::UNREAD_COUNTS_FEATURE)) {
            // errors.conversations.unread_counts.feature_not_enabled (en.yml).
            return response()->json(['error' => 'Conversation unread counts feature not enabled for this account'], 403);
        }

        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        return response()->json([
            'payload' => (new UnreadCountsCounter($account, $request->user(), $accountUser))->perform(),
        ]);
    }

    public function show(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        return response()->json((new ConversationResource($conversation))->toArray($request));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $inbox = $this->fetchAuthorizedInbox($request, $account);
        $contact = $this->fetchContact($request, $account);

        try {
            $contactInbox = $this->resolveContactInbox($request, $account, $inbox, $contact);
        } catch (UniqueConstraintViolationException) {
            return response()->json(['error' => 'source_id should be unique'], 422);
        }

        $this->authorizeInbox($request, $contactInbox->inbox);

        try {
            $conversation = DB::transaction(function () use ($request, $contactInbox) {
                $conversation = (new ConversationBuilder($request->all(), $contactInbox))->perform();

                if (filled($request->input('message'))) {
                    (new MessageBuilder($request->user(), $conversation, $request->input('message')))->perform();
                }

                return $conversation;
            });
        } catch (MessageValidationException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }

        return response()->json((new ConversationResource($conversation))->toArray($request));
    }

    public function update(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        // permitted_update_params: chỉ priority.
        $validated = $request->validate(['priority' => ['nullable', Rule::in(Conversation::PRIORITY_NAMES)]]);

        if (array_key_exists('priority', $validated)) {
            $conversation->update(['priority' => Conversation::priorityFromName($validated['priority'])]);
        }

        return response()->json((new ConversationResource($conversation))->toArray($request));
    }

    public function toggleStatus(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(Conversation::STATUS_NAMES)],
            'snoozed_until' => ['nullable', 'integer'],
        ]);

        if ($this->isBotHandoff($request, $conversation, $validated['status'] ?? null)) {
            $conversation->botHandoff();
            $success = true;
        } elseif (filled($validated['status'] ?? null)) {
            $conversation->status = Conversation::statusFromName($validated['status']);

            // Chatwoot chỉ parse khi có giá trị truthy. `null` là "Until next
            // reply"; parse null thành integer sẽ tạo epoch 1970 sai nghĩa.
            if (filled($request->input('snoozed_until'))) {
                $conversation->snoozed_until = DateRangeHelper::parseDateTime($request->input('snoozed_until'));
            }

            $success = $conversation->save();
        } else {
            $success = $conversation->toggleStatus();
        }

        // handle_human_open chỉ chạy khi người thật đứng sau yêu cầu.
        if ($conversation->isOpen() && $request->user() instanceof User) {
            $this->handleHumanOpen($request, $conversation);
        }

        return response()->json([
            'meta' => (object) [],
            'payload' => [
                'success' => $success,
                'conversation_id' => $conversation->display_id,
                'current_status' => $conversation->statusName(),
                'snoozed_until' => $conversation->snoozed_until?->toISOString(),
            ],
        ]);
    }

    public function togglePriority(Request $request, Account $account, int $conversationId): Response
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $validated = $request->validate(['priority' => ['nullable', Rule::in(Conversation::PRIORITY_NAMES)]]);

        $conversation->togglePriority($validated['priority'] ?? null);

        return response()->noContent(200);
    }

    public function mute(Request $request, Account $account, int $conversationId): Response
    {
        $this->fetchConversationForUser($request, $account, $conversationId)->mute();

        return response()->noContent(200);
    }

    public function unmute(Request $request, Account $account, int $conversationId): Response
    {
        $this->fetchConversationForUser($request, $account, $conversationId)->unmute();

        return response()->noContent(200);
    }

    public function toggleTypingStatus(Request $request, Account $account, int $conversationId): Response
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        // Y gốc: typing_status ngoài on|off → no-op nhưng vẫn head :ok. is_private
        // boolean: blank(false) của Laravel ≠ present? Ruby — TypingStatusManager
        // chuẩn hóa về bool, không dùng filled().
        (new TypingStatusManager($conversation, $request->user(), $request->only(['typing_status', 'is_private'])))
            ->toggleTypingStatus();

        $this->relayTypingToChannel($request, $conversation);

        return response()->noContent(200);
    }

    /**
     * Ngoài dashboard, kênh nào khai `outbound_typing` (docs/channel-capabilities.md
     * §2.2) thì khách cũng thấy "đang soạn tin". Ghi chú riêng tư không đẩy ra kênh.
     * Driver tự giới hạn nhịp — lõi không biết kênh nào chịu được bao nhiêu.
     */
    private function relayTypingToChannel(Request $request, Conversation $conversation): void
    {
        $isTypingOn = $request->input('typing_status') === 'on';
        $isPrivate = BooleanParam::from($request->input('is_private'));

        if (! $isTypingOn || $isPrivate || ! $conversation->inbox->supports(Capability::OutboundTyping)) {
            return;
        }

        ChannelActionRegistry::for($conversation->inbox)?->typing($conversation);
    }

    // ConversationCustomAttributesConcern#custom_attributes — ghi đè toàn bộ
    // custom_attributes; `merge=true` thì chỉ trộn các khoá được gửi.
    public function customAttributes(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $attributes = (array) $request->input('custom_attributes', []);

        if ($request->boolean('merge')) {
            $attributes = array_merge($conversation->custom_attributes ?? [], $attributes);
        }

        $conversation->custom_attributes = $attributes;
        $conversation->save();

        return response()->json((new ConversationResource($conversation))->toArray($request));
    }

    // ConversationCustomAttributesConcern#destroy_custom_attributes.
    public function destroyCustomAttributes(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $keys = (array) $request->input('custom_attributes', []);

        $conversation->custom_attributes = array_diff_key($conversation->custom_attributes ?? [], array_flip($keys));
        $conversation->save();

        return response()->json((new ConversationResource($conversation))->toArray($request));
    }

    // update_last_seen: mở hội thoại là đánh dấu đã đọc. Ghi thẳng bằng update
    // không hook (update_columns) nên KHÔNG bắn conversation.updated — FE tự hạ badge.
    public function updateLastSeen(Request $request, Account $account, int $conversationId): Response
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $isAssignee = $this->isAssignee($request, $conversation);

        // Mở hội thoại là dọn luôn thông báo chưa đọc của chính hội thoại đó.
        (new MarkConversationReadService($request->user(), $account, $conversation))->perform();

        if ($isAssignee && $conversation->assigneeUnreadMessages()->exists()) {
            $this->markSeenAt($conversation, now(), true);
        } elseif (! $isAssignee && $conversation->unreadMessages()->exists()) {
            $this->markSeenAt($conversation, now(), false);
        } elseif ($this->shouldUpdateLastSeen($conversation, $isAssignee)) {
            // Không còn tin chưa đọc: chỉ ghi lại khi mốc cũ quá 1 giờ (giảm ghi DB
            // khi agent nhảy qua lại giữa các hội thoại).
            $this->markSeenAt($conversation, now(), $isAssignee);
        }

        return response()->noContent();
    }

    // unread: lùi mốc đã xem về TRƯỚC tin incoming cuối 1 giây để badge hiện lại.
    public function unread(Request $request, Account $account, int $conversationId): Response
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $lastIncoming = $conversation->messages()
            ->where('message_type', Message::TYPE_INCOMING)
            ->reorder('id', 'desc')
            ->first();

        $this->markSeenAt($conversation, $lastIncoming?->created_at->copy()->subSecond(), true);

        return response()->noContent();
    }

    // update_last_seen_on_conversation: ghi cột trần (không hook, không đụng
    // updated_at) rồi báo cho các client khác vẽ lại badge.
    private function markSeenAt(Conversation $conversation, ?CarbonInterface $seenAt, bool $updateAssignee): void
    {
        $columns = ['agent_last_seen_at' => $seenAt];

        if ($updateAssignee) {
            $columns['assignee_last_seen_at'] = $seenAt;
        }

        $conversation->newModelQuery()->whereKey($conversation->id)->toBase()->update($columns);

        foreach ($columns as $column => $value) {
            $conversation->setAttribute($column, $value);
            $conversation->syncOriginalAttribute($column);
        }

        $this->notifyUnreadCountChanged($conversation);
    }

    // Conversations::UnreadCounts::Notifier — cùng cổng cờ tính năng, nhưng không
    // có tầng cache Redis nên bắn thẳng khi mốc đã xem vừa đổi.
    private function notifyUnreadCountChanged(Conversation $conversation): void
    {
        if (! $conversation->account->featureEnabled(self::UNREAD_COUNTS_FEATURE)) {
            return;
        }

        DomainEvent::dispatch(EventType::CONVERSATION_UNREAD_COUNT_CHANGED, ['conversation' => $conversation]);
    }

    // should_update_last_seen?: mốc nào cũ hơn 1 giờ (hoặc chưa có) thì mới ghi.
    private function shouldUpdateLastSeen(Conversation $conversation, bool $isAssignee): bool
    {
        $threshold = now()->subHour();
        $agentNeedsUpdate = $conversation->agent_last_seen_at === null
            || $conversation->agent_last_seen_at->lt($threshold);

        if (! $isAssignee) {
            return $agentNeedsUpdate;
        }

        return $agentNeedsUpdate
            || $conversation->assignee_last_seen_at === null
            || $conversation->assignee_last_seen_at->lt($threshold);
    }

    private function isAssignee(Request $request, Conversation $conversation): bool
    {
        return $conversation->assignee_id !== null && $conversation->assignee_id === $request->user()->id;
    }

    // bot_handoff?: chỉ agent bot mới bàn giao được, và chỉ khi hội thoại đang
    // pending mà bot yêu cầu chuyển sang open.
    private function isBotHandoff(Request $request, Conversation $conversation, ?string $status): bool
    {
        return $request->user() instanceof AgentBot
            && $conversation->status === Conversation::STATUS_PENDING
            && $status === 'open';
    }

    // handle_human_open: agent mở lại hội thoại thì tự nhận, administrator không;
    // cả hai đều gỡ bot khỏi hội thoại.
    private function handleHumanOpen(Request $request, Conversation $conversation): void
    {
        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        DB::transaction(function () use ($conversation, $accountUser, $request) {
            $conversation->newModelQuery()->whereKey($conversation->id)->lockForUpdate()->get();

            $conversation->assignee_agent_bot_id = null;

            if (! $accountUser->isAdministrator()) {
                $conversation->assignee_id = $request->user()->id;
            }

            $conversation->save();
        });
    }

    private function finder(Request $request, Account $account): ConversationFinder
    {
        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        return new ConversationFinder($request->user(), $account, $accountUser, $request->all());
    }

    private function fetchAuthorizedInbox(Request $request, Account $account): ?Inbox
    {
        if (blank($request->input('inbox_id'))) {
            return null;
        }

        $inbox = $account->inboxes()->findOrFail((int) $request->input('inbox_id'));
        $this->authorizeInbox($request, $inbox);

        return $inbox;
    }

    private function fetchContact(Request $request, Account $account): ?Contact
    {
        if (blank($request->input('contact_id'))) {
            return null;
        }

        return $account->contacts()->findOrFail((int) $request->input('contact_id'));
    }

    private function resolveContactInbox(Request $request, Account $account, ?Inbox $inbox, ?Contact $contact): ContactInbox
    {
        if ($inbox !== null && $contact !== null) {
            $contactInbox = (new ContactInboxBuilder(
                contact: $contact,
                inbox: $inbox,
                sourceId: $request->input('source_id'),
                hmacVerified: filter_var($request->input('hmac_verified'), FILTER_VALIDATE_BOOLEAN),
            ))->perform();

            if ($contactInbox !== null) {
                return $contactInbox;
            }
        }

        // Fallback bản gốc: tra theo source_id (scope inbox nếu có, không thì cả account).
        $lookup = $inbox !== null
            ? $inbox->contactInboxes()
            : ContactInbox::query()->whereHas('inbox', fn ($query) => $query->where('account_id', $account->id));

        return $lookup->where('source_id', $request->input('source_id'))->firstOrFail();
    }

    private function authorizeInbox(Request $request, Inbox $inbox): void
    {
        // InboxPolicy#show?: agent bot xem được mọi inbox của account.
        if ($request->user() instanceof AgentBot) {
            return;
        }

        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless(
            $accountUser->isAdministrator()
                || $inbox->inboxMembers()->where('user_id', $request->user()->id)->exists(),
            401,
            'You are not authorized to do this action'
        );
    }
}
