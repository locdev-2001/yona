<?php

namespace Modules\Inbox\Channel;

use Modules\Inbox\Contracts\MeteringGate;
use Modules\Inbox\Models\Conversation;

/**
 * No-op MeteringGate — disable-safe default khi billing module tắt.
 *
 * Inbox bind class này trong register(). Billing ServiceProvider override
 * bằng ConversationMeter sau khi boot (billing depends:["inbox"] → topo-sort).
 *
 * canStartNew/canReplyOnExisting đều true → tenant gửi/nhận bình thường
 * kể cả khi billing chưa boot / bị disable.
 *
 * ponytail: no-op pattern theo F10 spec. Đúng 0 logic → không test riêng.
 */
final class AllowAllMeteringGate implements MeteringGate
{
    public function canReplyOnExisting(Conversation $conversation): bool
    {
        return true;
    }

    public function canStartNew(string $channel): bool
    {
        return true;
    }

    public function meterReply(Conversation $conversation): void
    {
        // ponytail: no-op khi billing tắt — không đếm, không exception.
    }

    public function assertCanSend(Conversation $conversation): void
    {
        // ponytail: no-op khi billing tắt — không chặn, không throw.
    }
}
