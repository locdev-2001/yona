<?php

namespace App\Http\Controllers\WebApi;

use App\Builders\ContactInboxBuilder;
use App\Builders\ConversationBuilder;
use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Finders\ConversationFinder;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Services\Conversations\TypingStatusManager;
use App\Support\DateRangeHelper;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

// Port từ Api::V1::Accounts::ConversationsController của Chatwoot.
// Bỏ: filter/search (E1/E2), attachments (B9), transcript (F1),
// update_last_seen/unread (B8), custom_attributes (E1), destroy (đi cùng
// DeleteService các nhóm sau), bot_handoff (AgentBot chưa port).
class ConversationsController extends Controller
{
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

    public function meta(Request $request, Account $account): JsonResponse
    {
        $result = $this->finder($request, $account)->performMetaOnly();

        return response()->json(['meta' => $result['count']]);
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

        if (filled($validated['status'] ?? null)) {
            $conversation->status = Conversation::statusFromName($validated['status']);

            if ($request->has('snoozed_until')) {
                $conversation->snoozed_until = DateRangeHelper::parseDateTime($request->input('snoozed_until'));
            }

            $success = $conversation->save();
        } else {
            $success = $conversation->toggleStatus();
        }

        if ($conversation->isOpen()) {
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

        return response()->noContent(200);
    }

    // handle_human_open: agent mở lại hội thoại thì tự nhận; administrator không.
    private function handleHumanOpen(Request $request, Conversation $conversation): void
    {
        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        DB::transaction(function () use ($conversation, $accountUser, $request) {
            $conversation->newModelQuery()->whereKey($conversation->id)->lockForUpdate()->get();

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
