<?php

namespace App\Modules\Automation\Handlers;

use App\Models\Conversation;
use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;
use App\Modules\Integration\ChannelManager;
use Throwable;

/**
 * Gửi tin nhắn (action) — delegate ChannelManager::driver()->sendMessage()
 * (docs/crm-automation-workflow.md §Node Handler registry).
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
    public function __construct(private readonly ChannelManager $channels) {}

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

        if ($conversation === null) {
            $channelLabel = $channel ?? 'unknown';

            return NodeHandlerResult::skipped(
                "no conversation on channel {$channelLabel} for this {$run->subject_type}",
                branch: null,
            );
        }

        try {
            $this->channels->driver($conversation->channel)->sendMessage($conversation, [
                'body' => $node['config']['body'] ?? '',
            ]);
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
