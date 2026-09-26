<?php

namespace App\Messaging\Delivery;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Messaging\Structured\StructuredType;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Message;
use App\Services\Messaging\PublicFlowService;

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
     * @param  ?PublicFlowService  $publicFlows  phát token trang công khai (phase-05 §C) khi
     *                                           `plan()` không được truyền `$pageUrlProvider` riêng.
     */
    public function __construct(
        private readonly StructuredTypeRegistry $registry,
        private readonly array $renderersByChannel = [],
        private readonly ?PublicFlowService $publicFlows = null,
    ) {}

    /**
     * @param  (callable(Message): ?string)|null  $pageUrlProvider  trang công khai của tin;
     *                                                              null thì dùng `$publicFlows` mặc định.
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

        $pageUrlProvider ??= fn (Message $m) => $this->defaultPageUrl($m, $type, $attributes);
        $pageUrl = $type->needsPublicPage($attributes) ? $pageUrlProvider($message) : null;
        $text = $type->plainText($message->content, $attributes, $pageUrl);
        $choices = $type->choices($attributes);
        $text = $choices === [] ? $text : trim($text."\n\n".NumberedChoices::render($choices));

        // Không có renderer gốc nhưng kênh nhận được ảnh: gửi ảnh thẻ kèm đúng bản chữ trên.
        // Ảnh lỗi hoặc bridge chưa cấu hình thì CardImageService trả null, gửi chữ như cũ.
        $imageUrl = $capabilities->has(Capability::OutboundImage) && self::isVisualCard($type)
            ? app(CardImageService::class)->for($message)
            : null;

        $plan = match (true) {
            $imageUrl !== null => DeliveryPlan::imageText($text, $imageUrl),
            $choices === [] => DeliveryPlan::text($text),
            default => DeliveryPlan::textNumbered($text),
        };

        DegradeLog::record($message, $plan->level);

        return $plan;
    }

    /**
     * Trang mặc định khi tin cần trang công khai mà không ai truyền
     * `$pageUrlProvider` riêng: `webview` dùng đúng `page` đã khai; `cards` dò
     * từng thẻ tìm hành động `webview`/`order` (đặt mua cần trang sản phẩm);
     * `form` dài (đã qua `needsPublicPage()`) dùng trang "form".
     */
    private function defaultPageUrl(Message $message, StructuredType $type, array $attributes): ?string
    {
        if ($this->publicFlows === null) {
            return null;
        }

        return match ($type->contentType()) {
            'webview' => $this->publicFlows->issue($message, (string) $attributes['page']),
            'form' => $this->publicFlows->issue($message, 'form'),
            'cards' => $this->issueForCards($message, $attributes),
            default => null,
        };
    }

    private function issueForCards(Message $message, array $attributes): ?string
    {
        foreach ($attributes['items'] as $item) {
            foreach ($item['actions'] ?? [] as $action) {
                if ($action['kind'] === 'webview') {
                    return $this->publicFlows->issue($message, $action['page'], $item['id']);
                }

                if ($action['kind'] === 'order') {
                    return $this->publicFlows->issue($message, 'product', $item['id']);
                }
            }
        }

        return null;
    }

    /** Loại có ảnh vẽ được ở `services/zalo-bridge/src/card-render` — khớp `kind` bridge nhận. */
    private static function isVisualCard(StructuredType $type): bool
    {
        return in_array($type->contentType(), ['cards', 'order_status', 'webview', 'article'], true);
    }
}
