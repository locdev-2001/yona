<?php

namespace App\Modules\Automation\Handlers;

use App\Models\Conversation;
use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;
use App\Modules\Chat\Delivery\DeliveryPipeline;
use App\Modules\Chat\Delivery\OutboundMessage;
use App\Modules\Chat\Port\ChannelRegistry;
use Throwable;

/**
 * Gửi tin nhắn (action) — qua DeliveryPipeline như mọi đường gửi khác
 * (docs/crm-automation-workflow.md §Node Handler registry).
 *
 * Đi qua pipeline chứ không gọi thẳng driver: tin automation vẫn được thống kê
 * và broadcast như tin người gửi.
 *
 * Channel resolve theo subject (§Execution semantics dòng 78):
 * - subject=Conversation (trigger tin nhắn đến) → trả lời ngay hội thoại đó.
 * - subject=Lead/Contact → node config chọn channel tường minh, resolve qua
 *   Conversation::where('lead_id'/'contact_id', ...)->where('channel', ...).
 *   Không có hội thoại trên kênh đó → skipped (giới hạn nền tảng, Zalo cá
 *   nhân không cold-send được tới người lạ — không phải lỗi).
 */
class SendMessageNodeHandler implements NodeHandler
{
    public function __construct(
        private readonly ChannelRegistry $channels,
        private readonly DeliveryPipeline $pipeline,
    ) {}

    public function type(): string
    {
        return 'send_message';
    }

    public function handle(WorkflowRun $run, array $node): NodeHandlerResult
    {
        $channel = $node['config']['channel'] ?? null;

        $conversation = match ($run->subject_type) {
            'conversation' => $run->subject(),
            'lead' => Conversation::where('lead_id', $run->subject_id)->where('channel', $channel)->first(),
            'contact' => Conversation::where('contact_id', $run->subject_id)->where('channel', $channel)->first(),
            default => null,
        };

        // instanceof chứ không phải !== null: subject() trả Model chung, thu hẹp
        // kiểu ở đây để money-path bên dưới nhận đúng Conversation.
        if (! $conversation instanceof Conversation) {
            $channelLabel = $channel ?? 'unknown';

            return NodeHandlerResult::skipped(
                "no conversation on channel {$channelLabel} for this {$run->subject_type}",
                branch: null,
            );
        }

        $body = trim((string) ($node['config']['body'] ?? ''));

        // Chặn tường minh thay vì gửi tin trắng cho khách — node cấu hình thiếu
        // nội dung là lỗi cấu hình, phải hiện trong audit log của workflow.
        if ($body === '') {
            return NodeHandlerResult::failed('send message failed: nội dung tin trống');
        }

        try {
            $this->pipeline->send(
                $this->channels->driver($conversation->channel),
                $conversation,
                OutboundMessage::text($body),
            );
        } catch (Throwable $e) {
            // Broad catch is deliberate (never let a driver error crash the
            // engine loop) — include the exception class so a genuine driver
            // bug is still distinguishable in the audit log from an expected
            // send failure (e.g. rate limit, circuit open).
            return NodeHandlerResult::failed('send message failed ('.$e::class.'): '.$e->getMessage());
        }

        return NodeHandlerResult::success('message sent');
    }
}
