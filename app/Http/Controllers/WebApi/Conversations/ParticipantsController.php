<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Controllers\Controller;
use App\Http\Resources\AgentResource;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Port từ Api::V1::Accounts::Conversations::ParticipantsController.
class ParticipantsController extends Controller
{
    public function show(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        return $this->participantsResponse($request, $account, $this->participantUserIds($conversation));
    }

    // create.json.jbuilder chỉ liệt kê những participant VỪA được thêm.
    public function store(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $requestedIds = $this->requestedUserIds($request);
        $idsToAdd = array_values(array_diff($requestedIds, $this->participantUserIds($conversation)));

        if ($this->invalidParticipantIds($conversation, $idsToAdd) !== []) {
            return $this->invalidParticipantIdsResponse();
        }

        DB::transaction(function () use ($conversation, $idsToAdd) {
            foreach ($idsToAdd as $userId) {
                $conversation->addParticipant($userId);
            }
        });

        $this->notifyUnreadCountChange($account, $conversation, $idsToAdd !== []);

        return $this->participantsResponse($request, $account, $idsToAdd);
    }

    public function update(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $requestedIds = $this->requestedUserIds($request);
        $currentIds = $this->participantUserIds($conversation);
        $idsToAdd = array_values(array_diff($requestedIds, $currentIds));
        $idsToRemove = array_values(array_diff($currentIds, $requestedIds));

        if ($this->invalidParticipantIds($conversation, $idsToAdd) !== []) {
            return $this->invalidParticipantIdsResponse();
        }

        DB::transaction(function () use ($conversation, $idsToAdd, $idsToRemove) {
            foreach ($idsToAdd as $userId) {
                $conversation->addParticipant($userId);
            }

            $conversation->conversationParticipants()->whereIn('user_id', $idsToRemove)->delete();
        });

        $this->notifyUnreadCountChange($account, $conversation, $idsToAdd !== [] || $idsToRemove !== []);

        return $this->participantsResponse($request, $account, $this->participantUserIds($conversation));
    }

    public function destroy(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $requestedIds = $this->requestedUserIds($request);
        $idsToRemove = array_values(array_intersect($this->participantUserIds($conversation), $requestedIds));

        DB::transaction(function () use ($conversation, $requestedIds) {
            $conversation->conversationParticipants()->whereIn('user_id', $requestedIds)->delete();
        });

        $this->notifyUnreadCountChange($account, $conversation, $idsToRemove !== []);

        return response()->json(null, 200);
    }

    /** @return list<int> */
    private function requestedUserIds(Request $request): array
    {
        return collect($request->input('user_ids', []))
            ->map(fn ($userId) => (int) $userId)
            ->values()
            ->all();
    }

    /** @return list<int> */
    private function participantUserIds(Conversation $conversation): array
    {
        return $conversation->conversationParticipants()
            ->orderBy('id')
            ->pluck('user_id')
            ->map(fn ($userId) => (int) $userId)
            ->all();
    }

    /**
     * @param  list<int>  $idsToAdd
     * @return list<int>
     */
    private function invalidParticipantIds(Conversation $conversation, array $idsToAdd): array
    {
        $assignableIds = $conversation->inbox->assignableAgents()->pluck('id')->all();

        return array_values(array_diff($idsToAdd, $assignableIds));
    }

    private function invalidParticipantIdsResponse(): JsonResponse
    {
        return response()->json(['error' => 'Invalid participant IDs'], 422);
    }

    /** @param list<int> $userIds */
    private function participantsResponse(Request $request, Account $account, array $userIds): JsonResponse
    {
        /** @var Collection<int, User> $users */
        $users = User::query()->whereIn('id', $userIds)->with('accountUsers')->get()
            ->sortBy(fn (User $user) => array_search($user->id, $userIds, true))
            ->values();

        return response()->json(AgentResource::forAccount($users, $account));
    }

    // notify_unread_count_change — cùng cặp cờ tính năng như endpoint unread_counts.
    private function notifyUnreadCountChange(Account $account, Conversation $conversation, bool $changed): void
    {
        if (! $changed) {
            return;
        }

        if (! $account->featureEnabled('conversation_unread_counts') || ! $account->featureEnabled('unread_count_for_filters')) {
            return;
        }

        DomainEvent::dispatch(EventType::CONVERSATION_UNREAD_COUNT_CHANGED, ['conversation' => $conversation]);
    }
}
