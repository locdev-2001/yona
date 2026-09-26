<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\Money;
use App\Messaging\Structured\PayloadContext;
use App\Models\Message;

/**
 * Khách gửi từ sheet "Đặt mua" của một thẻ sản phẩm. Không phải đơn hàng: chỉ là
 * yêu cầu để nhân viên xác nhận trong chat. Tên, ảnh, giá đều lấy lại từ thẻ gốc,
 * không tin số liệu client gửi lên.
 */
final class OrderRequestType extends AbstractStructuredType
{
    public function __construct(private readonly CardsType $cards) {}

    public function contentType(): string
    {
        return 'order_request';
    }

    public function allowedMessageTypes(): array
    {
        return [Message::TYPE_INCOMING];
    }

    public function rules(): array
    {
        return [
            'content' => ['nullable', 'string', 'max:2000'],
            'source_message_id' => ['required', 'integer'],
            'item_id' => ['required', 'string', 'max:64'],
            // `{tên biến thể: giá trị}` từ widget, hoặc `[{name, value}]` như dạng đã lưu.
            'selections' => ['nullable', 'array'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'note' => ['nullable', 'string', 'max:300'],
        ];
    }

    public function normalize(array $attributes, PayloadContext $context): array
    {
        $item = $this->sourceItem($attributes, $context);
        $selections = $this->selections($item, self::requestedMap($attributes['selections'] ?? []));
        $quantity = (int) $attributes['quantity'];

        if ($quantity > ($item['max_quantity'] ?? 999)) {
            throw InvalidStructuredPayload::because('quantity_exceeded');
        }

        $price = $item['price'] ?? null;

        return array_filter([
            'source_message_id' => (int) $attributes['source_message_id'],
            'item_id' => $item['id'],
            'title' => $item['title'],
            'media_url' => $this->mediaFor($item, $selections),
            'selections' => $selections === [] ? null : $selections,
            'selection_label' => $selections === [] ? null : implode(' · ', array_column($selections, 'label')),
            'quantity' => $quantity,
            'unit_price' => $price === null ? null : ['amount' => $price['amount'], 'currency' => $price['currency']],
            'total' => $price === null ? null : ['amount' => $price['amount'] * $quantity, 'currency' => $price['currency']],
            'note' => filled($attributes['note'] ?? null) ? trim($attributes['note']) : null,
        ], fn (mixed $value) => $value !== null);
    }

    public function plainText(?string $content, array $attributes, ?string $pageUrl = null): string
    {
        $total = $attributes['total'] ?? null;

        return self::lines([
            __('messaging.order_request.line', [
                'title' => $attributes['title'],
                'selection' => isset($attributes['selection_label']) ? " · {$attributes['selection_label']}" : '',
                'quantity' => $attributes['quantity'],
            ]).($total === null ? '' : ' = '.Money::format($total['amount'], $total['currency'])),
            isset($attributes['note']) ? __('messaging.order_request.note', ['note' => $attributes['note']]) : null,
        ]);
    }

    public function previewText(?string $content, array $attributes): string
    {
        return __('messaging.order_request.preview', ['title' => $attributes['title']]);
    }

    private function sourceItem(array $attributes, PayloadContext $context): array
    {
        $source = $context->conversation->messages()
            ->whereKey($attributes['source_message_id'])
            ->where('content_type', Message::CONTENT_TYPES['cards'])
            ->whereIn('message_type', [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE])
            ->first();

        $item = $source === null ? null : $this->findSourceItem($source, (string) $attributes['item_id'], $context);

        if ($item === null || ! $this->orderable($item)) {
            throw InvalidStructuredPayload::because('unknown_item');
        }

        return $item;
    }

    private function findSourceItem(Message $source, string $itemId, PayloadContext $context): ?array
    {
        try {
            return CardsType::findItem($this->cards->normalize($source->content_attributes ?? [], $context), $itemId);
        } catch (InvalidStructuredPayload|\TypeError) {
            // Thẻ tạo trước khi có lõi có thể sai schema: coi như không đặt được.
            return null;
        }
    }

    /** @return array<string, string> */
    private static function requestedMap(array $selections): array
    {
        if (! array_is_list($selections)) {
            return array_map(fn (mixed $value) => is_scalar($value) ? (string) $value : '', $selections);
        }

        return collect($selections)
            ->filter(fn (mixed $entry) => is_array($entry) && isset($entry['name'], $entry['value']))
            ->mapWithKeys(fn (array $entry) => [(string) $entry['name'] => (string) $entry['value']])
            ->all();
    }

    private function orderable(array $item): bool
    {
        return in_array('order', array_column($item['actions'] ?? [], 'kind'), true);
    }

    /** @return list<array{name: string, value: string, label: string}> */
    private function selections(array $item, array $requested): array
    {
        $selections = [];

        foreach ($item['variants'] ?? [] as $variant) {
            $option = collect($variant['options'])->firstWhere('value', $requested[$variant['name']] ?? null);

            if ($option === null || ($option['disabled'] ?? false)) {
                throw InvalidStructuredPayload::because('invalid_selection', ['name' => $variant['name']]);
            }

            $selections[] = ['name' => $variant['name'], 'value' => $option['value'], 'label' => $option['label']];
        }

        if (count($requested) !== count($selections)) {
            throw InvalidStructuredPayload::because('invalid_selection', ['name' => implode(', ', array_keys($requested))]);
        }

        return $selections;
    }

    /** Ảnh của lựa chọn đầu tiên có ảnh (thường là màu), không thì ảnh thẻ. */
    private function mediaFor(array $item, array $selections): ?string
    {
        foreach ($item['variants'] ?? [] as $index => $variant) {
            $option = collect($variant['options'])->firstWhere('value', $selections[$index]['value'] ?? null);

            if (isset($option['media_url'])) {
                return $option['media_url'];
            }
        }

        return $item['media_url'] ?? null;
    }
}
