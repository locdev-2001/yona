<?php

namespace App\Services\Zalo;

use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Cache;

/**
 * Sự kiện trạng-thái-tin của bridge (undo / reaction / seen / delivered) đi THEO
 * chính bản ghi tin, ghi vào `content_attributes` — đúng cách Chatwoot giữ
 * `external_error`, `in_reply_to_external_id`… trên cột đó thay vì bảng riêng.
 * Port từ MessageStatusService + ZaloStateEventParser của nhánh `main`.
 *
 * Nhận source_id đã bóc sẵn (RelayEventParser) — lớp này không biết hình dạng
 * payload của zca. Mọi cập nhật đi qua model (không phải query builder) để hook
 * `updated` phát `message.updated` cho realtime.
 */
class MessageStateService
{
    /** Chỉ NÂNG trạng thái; biên nhận đến trễ/lặp không được kéo tick lùi. */
    private const UPGRADABLE_STATUSES = [Message::STATUSES['sent'], Message::STATUSES['delivered']];

    /**
     * Khách gửi rồi thu hồi ngay: sự kiện `undo` có thể tới TRƯỚC tin nó nói đến
     * (hai đường HTTP khác nhau, hàng đợi khác nhau). Nhớ lại source_id đã bị thu
     * hồi trong ngần này để tin đến sau bị đánh dấu xoá ngay, không loé lên rồi tắt.
     */
    private const PENDING_RECALL_TTL_MINUTES = 30;

    /**
     * Thu hồi tin — đánh dấu như tin bị xoá của lõi (Message::markDeleted, port từ
     * messages_controller.rb#destroy) kèm xoá đính kèm. Chưa thấy tin thì ghi
     * "bia mộ" để lượt inbound ngay sau đó áp lại.
     */
    public function applyRecall(Inbox $inbox, ?string $sourceId): bool
    {
        if (blank($sourceId)) {
            return false;
        }

        $message = $this->findMessage($inbox, $sourceId);

        if ($message === null) {
            Cache::put($this->pendingRecallKey($inbox, $sourceId), true, now()->addMinutes(self::PENDING_RECALL_TTL_MINUTES));

            return false;
        }

        if ($message->isDeleted()) {
            return false;
        }

        $message->markDeleted($inbox->account->locale);

        return true;
    }

    /**
     * Tin vừa được dựng từ lane inbound: nếu sự kiện thu hồi đã tới trước nó thì
     * áp ngay. Gọi từ BridgeEventService sau IncomingMessageService.
     */
    public function applyPendingRecall(Inbox $inbox, ?string $sourceId): bool
    {
        if (blank($sourceId) || ! Cache::pull($this->pendingRecallKey($inbox, $sourceId))) {
            return false;
        }

        $message = $this->findMessage($inbox, $sourceId);

        if ($message === null || $message->isDeleted()) {
            return false;
        }

        $message->markDeleted($inbox->account->locale);

        return true;
    }

    /**
     * Cảm xúc trên tin. Mã rỗng = người đó GỠ cảm xúc của chính mình (zca
     * `Reactions.NONE`) — không phải xoá cảm xúc của mọi người.
     *
     * @param  list<array{source_id: string, icon: string, by: string, is_self: bool}>  $reactions
     */
    public function applyReactions(Inbox $inbox, array $reactions): int
    {
        $applied = 0;

        foreach ($reactions as $reaction) {
            $message = $this->findMessage($inbox, $reaction['source_id']);
            $by = $this->reactionActor($reaction);

            if ($message === null || $by === null) {
                continue;
            }

            $emoji = $reaction['icon'] === '' ? null : ReactionIcons::emoji($reaction['icon']);

            if ($message->setReaction($by, $emoji)) {
                $applied++;
            }
        }

        return $applied;
    }

    /**
     * Biên nhận `seen`/`delivered` chỉ áp cho tin ĐI (tin đến không có tick), và
     * mất một biên nhận không mất nghiệp vụ nên chỉ cập nhật những tin tìm được.
     *
     * @param  list<string>  $sourceIds
     */
    public function applyReceipts(Inbox $inbox, array $sourceIds, string $kind): int
    {
        $status = $kind === 'seen' ? Message::STATUSES['read'] : Message::STATUSES['delivered'];

        $messages = Message::query()
            ->where('inbox_id', $inbox->id)
            ->where('message_type', Message::TYPE_OUTGOING)
            ->whereIn('source_id', array_filter($sourceIds))
            ->whereIn('status', self::UPGRADABLE_STATUSES)
            ->where('status', '<', $status)
            ->get();

        foreach ($messages as $message) {
            $message->update(['status' => $status]);
        }

        return $messages->count();
    }

    /**
     * Cảm xúc do CHÍNH tài khoản Zalo của tenant thả (agent bấm trong Yona rồi
     * Zalo dội lại, hoặc chủ shop thả trên điện thoại) đi vào cùng một ô "agent"
     * để không đếm thành hai người.
     *
     * @param  array{source_id: string, icon: string, by: string, is_self: bool}  $reaction
     */
    private function reactionActor(array $reaction): ?string
    {
        if ($reaction['is_self']) {
            return Message::REACTION_BY_AGENT_PREFIX.'self';
        }

        return blank($reaction['by']) ? null : $reaction['by'];
    }

    private function pendingRecallKey(Inbox $inbox, string $sourceId): string
    {
        return "zalo:pending-recall:{$inbox->id}:{$sourceId}";
    }

    private function findMessage(Inbox $inbox, ?string $sourceId): ?Message
    {
        return blank($sourceId)
            ? null
            : Message::query()->where('inbox_id', $inbox->id)->where('source_id', $sourceId)->first();
    }
}
