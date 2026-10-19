<?php

namespace App\Messaging\Delivery;

use App\Channels\CapabilitySet;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Message;

/**
 * `Message` + `CapabilitySet` của kênh → `DeliveryPlan`. Nơi DUY NHẤT quyết
 * định mức hạ cấp; mỗi `SendOn*Service` chỉ hỏi rồi gửi từng phần, không tự
 * rẽ nhánh theo `content_type` (docs/system-architecture.md §3).
 */
final class DeliveryPlanner
{
    /**
     * @param  array<class-string, NativeRenderer>  $renderersByChannel  mỗi kênh có wire
     *                                                                   format riêng dù trùng capability (vd FB, Telegram, LINE đều
     *                                                                   `outbound_quick_reply` nhưng payload khác nhau) — khoá bằng
     *                                                                   class kênh (`$inbox->channel::class`) để không lẫn renderer.
     */
    public function __construct(
        private readonly StructuredTypeRegistry $registry,
        private readonly array $renderersByChannel = [],
    ) {}

    public function plan(Message $message, CapabilitySet $capabilities): DeliveryPlan
    {
        $type = $this->registry->for($message->contentTypeName());

        if ($type === null) {
            return DeliveryPlan::text((string) $message->outgoingContent());
        }

        $attributes = $this->registry->read($message);

        if ($attributes === null) {
            // Tin đời cũ payload sai schema lõi mới — gửi nguyên chữ như trước khi có lõi.
            return DeliveryPlan::text((string) $message->outgoingContent());
        }

        $renderer = $this->renderersByChannel[$message->inbox->channel::class] ?? null;

        if ($renderer !== null && $capabilities->has($renderer->capability()) && $renderer->supports($type)) {
            $plan = DeliveryPlan::native($renderer->render($message, $attributes));
            DegradeLog::record($message, $plan->level);

            return $plan;
        }

        $text = $type->plainText($message->content, $attributes);
        $choices = $type->choices($attributes);

        $plan = $choices === []
            ? DeliveryPlan::text($text)
            : DeliveryPlan::textNumbered(trim($text."\n\n".NumberedChoices::render($choices)));

        DegradeLog::record($message, $plan->level);

        return $plan;
    }
}
