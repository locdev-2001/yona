<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Finders\ForwardTargetFinder;
use App\Http\Controllers\Controller;
use App\Http\Resources\ForwardTargetResource;
use App\Http\Resources\MessageResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Messages\Forwarding\ForwardBlock;
use App\Services\Messages\Forwarding\ForwardException;
use App\Services\Messages\Forwarding\ForwardRequirements;
use App\Services\Messages\Forwarding\MessageForwarder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Chuyển tiếp một tin sang hội thoại khác (có thể khác hộp thư, khác kênh). Mỗi
 * hội thoại đích nhận một tin mới độc lập; luật nằm ở ForwardRequirements.
 */
class MessageForwardsController extends Controller
{
    public function targets(Request $request, Account $account, int $conversationId, int $messageId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $source = $conversation->visibleMessages()->findOrFail($messageId);
        $user = $request->user();
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless($user instanceof User && $accountUser instanceof AccountUser, 403);

        $sourceBlock = ForwardRequirements::check($source, null, $account->locale);

        if ($sourceBlock !== null) {
            return response()->json($sourceBlock->toErrorResponse(), 422);
        }

        $query = $request->query('q');
        $targets = (new ForwardTargetFinder($user, $account, $accountUser, $conversation))
            ->perform(is_string($query) ? $query : '');

        return response()->json([
            'max_targets' => MessageForwarder::MAX_TARGETS,
            'payload' => $targets
                ->map(fn (Conversation $target) => ForwardTargetResource::toArray(
                    $target,
                    ForwardRequirements::check($source, $target, $account->locale),
                ))
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request, Account $account, int $conversationId, int $messageId, MessageForwarder $forwarder): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $source = $conversation->visibleMessages()->findOrFail($messageId);
        $targetIds = $this->targetIds($request->input('conversation_ids'), $account->locale);

        if ($targetIds instanceof ForwardBlock) {
            return response()->json($targetIds->toErrorResponse(), 422);
        }

        $sourceBlock = ForwardRequirements::check($source, null, $account->locale);

        if ($sourceBlock !== null) {
            return response()->json($sourceBlock->toErrorResponse(), 422);
        }

        return response()->json([
            'payload' => array_map(
                fn (int $displayId) => $this->forwardTo($request, $account, $source, $displayId, $forwarder),
                $targetIds,
            ),
        ]);
    }

    /** @return array<string, mixed> */
    private function forwardTo(Request $request, Account $account, Message $source, int $displayId, MessageForwarder $forwarder): array
    {
        /** @var User|AgentBot $actor */
        $actor = $request->user();
        $accountUser = $request->attributes->get('currentAccountUser');
        $target = $account->conversations()->where('display_id', $displayId)->first();

        // Không phân biệt "không có" với "không được xem" để không lộ hội thoại của hộp thư khác.
        if ($target === null || ! $target->isVisibleTo($actor, $accountUser instanceof AccountUser ? $accountUser : null)) {
            return $this->failedResult($displayId, ForwardBlock::translated(ForwardBlock::TARGET_NOT_FOUND, $account->locale));
        }

        try {
            $message = $forwarder->forward($source, $target, $actor);
        } catch (ForwardException $exception) {
            return $this->failedResult($displayId, $exception->block);
        }

        return ['conversation_id' => $displayId, 'ok' => true, 'message' => (new MessageResource($message))->toArray($request)];
    }

    /** @return array{conversation_id: int, ok: false, code: string, error: string} */
    private function failedResult(int $displayId, ForwardBlock $block): array
    {
        return ['conversation_id' => $displayId, 'ok' => false, 'code' => $block->code, 'error' => $block->message];
    }

    /**
     * `conversation_ids`: mảng display_id nguyên dương, không trùng, 1..MAX_TARGETS.
     *
     * @return list<int>|ForwardBlock
     */
    private function targetIds(mixed $input, ?string $locale): array|ForwardBlock
    {
        $ids = is_array($input) ? array_values($input) : [];
        $valid = array_filter($ids, fn ($id) => (is_int($id) || (is_string($id) && ctype_digit($id))) && (int) $id > 0);

        if ($ids === [] || count($valid) !== count($ids)) {
            return ForwardBlock::translated(ForwardBlock::NO_TARGETS, $locale);
        }

        $unique = array_values(array_unique(array_map('intval', $valid)));

        if (count($unique) > MessageForwarder::MAX_TARGETS) {
            return ForwardBlock::translated(ForwardBlock::TOO_MANY_TARGETS, $locale, ['max' => MessageForwarder::MAX_TARGETS]);
        }

        return $unique;
    }
}
