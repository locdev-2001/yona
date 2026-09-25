<?php

namespace App\Messaging\Delivery;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Messaging\Structured\StructuredType;
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

    /**
     * @param  (callable(Message): ?string)|null  $pageUrlProvider  trang công khai của tin
     *                                                              (phase 5, chưa có nên mặc định null)
     */
    public function plan(Message $message, CapabilitySet $capabilities, ?callable $pageUrlProvider = null): DeliveryPlan
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

        // 6b: không có renderer gốc nhưng kênh nhận được ảnh — vẽ ảnh thẻ (satori)
        // cho các loại "thẻ hình" thay vì chỉ hạ xuống chữ. Ảnh lỗi/chưa cấu hình
        // bridge thì CardImageService trả null, rơi tiếp xuống nhánh chữ bên dưới.
        if ($capabilities->has(Capability::OutboundImage) && self::isVisualCard($type)) {
            $imageUrl = app(CardImageService::class)->for($message);

            if ($imageUrl !== null) {
                $imagePageUrl = $pageUrlProvider !== null ? $pageUrlProvider($message) : null;
                $imageText = $type->plainText($message->content, $attributes, $imagePageUrl);
                $imageChoices = $type->choices($attributes);
                $imageText = $imageChoices === [] ? $imageText : trim($imageText."\n\n".NumberedChoices::render($imageChoices));

                $plan = DeliveryPlan::imageText($imageText, $imageUrl);
                DegradeLog::record($message, $plan->level);

                return $plan;
            }
        }

        $pageUrl = $pageUrlProvider !== null ? $pageUrlProvider($message) : null;
        $text = $type->plainText($message->content, $attributes, $pageUrl);
        $choices = $type->choices($attributes);

        $plan = $choices === []
            ? DeliveryPlan::text($text)
            : DeliveryPlan::textNumbered(trim($text."\n\n".NumberedChoices::render($choices)));

        DegradeLog::record($message, $plan->level);

        return $plan;
    }

    /** Loại có ảnh vẽ được ở `services/zalo-bridge/src/card-render` — khớp `kind` bridge nhận. */
    private static function isVisualCard(StructuredType $type): bool
    {
        return in_array($type->contentType(), ['cards', 'order_status', 'webview', 'article'], true);
    }
}
