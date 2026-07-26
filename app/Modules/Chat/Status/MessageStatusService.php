<?php

namespace App\Modules\Chat\Status;

use App\Events\MessageStateChanged;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\PendingMessageState;
use App\Modules\Chat\Intake\DuplicateResolver;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * P02 — trạng thái tin ĐI THEO messages (taxonomy loại 2). Channel-agnostic:
 * nhận DTO trung tính đã parse (driver parse shape platform — Rule 16).
 *
 * Idempotency KHÔNG cần kho:
 *  - recall: set-once (whereNull recalled_at)
 *  - receipts: set-once (mốc ĐẦU tiên; replay no-op) · nhóm per-member → BỎ QUA (guard cứng)
 *  - reaction: upsert unique (message_id, reactor_uid), reacted_at monotonic
 *    (event cũ hơn không ghi đè — kể cả NONE=delete, chống cảm xúc ma out-of-order)
 *
 * Event-đến-trước-tin: recall (nghiệp vụ) → pending BOUNDED 48h, ingest quét áp lại;
 * chatty (receipt/reaction) → DROP có chủ đích (test chứng minh).
 * KHÔNG meter — mọi đường ở đây không chạm MeteringService.
 */
class MessageStatusService
{
    public function __construct(private readonly DuplicateResolver $resolver) {}

    /**
     * @param  array{target_msg_id: string, recalled_at?: Carbon|string|null, payload?: array<string, mixed>}  $recall
     * @return string 'applied'|'pending'|'noop'
     */
    public function applyRecall(?string $channelAccountId, array $recall): string
    {
        $message = $this->resolve($channelAccountId, $recall['target_msg_id']);

        if ($message === null) {
            // Tin chưa về (event-trước-tin) → pending bounded, ingest áp lại sau.
            PendingMessageState::query()->insertOrIgnore([
                'id' => (string) Str::uuid(),
                'workspace_id' => currentWorkspace()->id,
                'channel_account_id' => $channelAccountId,
                'event_type' => 'undo',
                'target_msg_id' => $recall['target_msg_id'],
                'payload' => json_encode($recall['payload'] ?? []),
                'expires_at' => now()->addHours(PendingMessageState::TTL_HOURS),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return 'pending';
        }

        return $this->markRecalled($message, $recall['recalled_at'] ?? null) ? 'applied' : 'noop';
    }

    /**
     * Receipts 1-1 (kind seen|delivered). Nhóm là per-member (seenUids) — scalar
     * SAI cho nhóm → caller đã lọc is_group, đây guard thêm theo thread_type.
     *
     * @param  list<array{target_msg_id: string, kind: string}>  $receipts
     */
    public function applyReceipts(?string $channelAccountId, array $receipts): void
    {
        // MED-1: batch resolve — seen có thể 1-50 tin/event, tránh 2N query
        $messages = $this->resolveMany($channelAccountId, array_column($receipts, 'target_msg_id'));

        foreach ($receipts as $receipt) {
            $message = $messages[$receipt['target_msg_id']] ?? null;

            // Chatty drop-on-miss có chủ đích. Guard: chỉ tin MÌNH gửi + thread 1-1.
            if ($message === null || $message->direction === 'in' || $message->conversation?->thread_type === 1) {
                continue;
            }

            $changed = false;
            if ($message->delivered_at === null) {
                $message->delivered_at = now();
                $changed = true;
            }
            if ($receipt['kind'] === 'seen' && $message->seen_at === null) {
                $message->seen_at = now();
                $changed = true;
            }

            if ($changed) {
                $message->save();
                $this->broadcast($message, $receipt['kind']);
            }
        }
    }

    /**
     * @param  list<array{target_msg_id: string, reactor_uid: string, icon: string, reacted_at: Carbon}>  $reactions
     */
    public function applyReactions(?string $channelAccountId, array $reactions): void
    {
        $messages = $this->resolveMany($channelAccountId, array_column($reactions, 'target_msg_id'));

        foreach ($reactions as $reaction) {
            $message = $messages[$reaction['target_msg_id']] ?? null;

            if ($message === null) {
                continue; // chatty drop-on-miss có chủ đích
            }

            $existing = MessageReaction::where('message_id', $message->id)
                ->where('reactor_uid', $reaction['reactor_uid'])
                ->first();

            // Monotonic: event cũ hơn bản ghi hiện tại → bỏ (out-of-order MED-1)
            if ($existing !== null && $existing->reacted_at->gt($reaction['reacted_at'])) {
                continue;
            }

            // Review LOW-1: replay trùng hệt (cùng ts, cùng icon) → no-op, KHÔNG broadcast lần 2
            if ($existing !== null && $existing->icon === $reaction['icon'] && $existing->reacted_at->equalTo($reaction['reacted_at'])) {
                continue;
            }

            if ($reaction['icon'] === '') { // NONE = gỡ cảm xúc
                if ($existing !== null) {
                    $existing->delete();
                    $this->broadcast($message, 'reaction');
                }

                continue;
            }

            if ($existing === null) {
                MessageReaction::create([
                    'workspace_id' => $message->workspace_id,
                    'message_id' => $message->id,
                    'reactor_uid' => $reaction['reactor_uid'],
                    'icon' => $reaction['icon'],
                    'reacted_at' => $reaction['reacted_at'],
                ]);
            } else {
                $existing->update(['icon' => $reaction['icon'], 'reacted_at' => $reaction['reacted_at']]);
            }

            $this->broadcast($message, 'reaction');
        }
    }

    /**
     * Ingest gọi SAU khi tạo message mới có source_id: áp undo đến-trước-tin rồi xoá pending.
     */
    public function applyPendingFor(Message $message): void
    {
        if ($message->source_id === null) {
            return;
        }

        // Review INFO: chỉ quét loại pending mình xử lý — loại mới sau này phải
        // tự thêm handler, không bị xoá-không-áp.
        $pendings = PendingMessageState::where('target_msg_id', $message->source_id)
            ->where('event_type', 'undo')
            ->where('expires_at', '>', now())
            ->get();

        foreach ($pendings as $pending) {
            $this->markRecalled($message, $pending->payload['recalled_at'] ?? null);
            $pending->delete();
        }
    }

    private function resolve(?string $channelAccountId, string $sourceId): ?Message
    {
        return $channelAccountId === null ? null : $this->resolver->findForAccount($channelAccountId, $sourceId);
    }

    /**
     * @param  list<string>  $sourceIds
     * @return array<string, Message>
     */
    private function resolveMany(?string $channelAccountId, array $sourceIds): array
    {
        return $channelAccountId === null ? [] : $this->resolver->findManyForAccount($channelAccountId, $sourceIds);
    }

    private function markRecalled(Message $message, Carbon|string|null $recalledAt): bool
    {
        // Set-once: replay/duplicate không đổi giá trị
        $updated = Message::whereKey($message->id)
            ->whereNull('recalled_at')
            ->update(['recalled_at' => $recalledAt !== null ? Carbon::parse($recalledAt) : now()]);

        if ($updated > 0) {
            $this->broadcast($message->refresh(), 'recalled');

            return true;
        }

        return false;
    }

    private function broadcast(Message $message, string $state): void
    {
        event(new MessageStateChanged($message, $state));
    }
}
