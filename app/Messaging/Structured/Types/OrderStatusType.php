<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\Action;
use App\Messaging\Structured\Money;
use App\Messaging\Structured\PayloadContext;
use Illuminate\Support\Carbon;

/**
 * Thẻ trạng thái đơn. Yona không có bảng đơn hàng: mọi thông tin đến từ payload
 * (nhân viên, bot, hoặc nguồn làm giàu như KiotViet/Sapo).
 */
final class OrderStatusType extends AbstractStructuredType
{
    public const STATUSES = ['placed', 'confirmed', 'shipped', 'delivering', 'delivered', 'cancelled'];

    public function contentType(): string
    {
        return 'order_status';
    }

    public function rules(): array
    {
        return [
            'content' => ['nullable', 'string', 'max:2000'],
            'order_ref' => ['required', 'string', 'max:40'],
            'status' => ['required', 'string', 'in:'.implode(',', self::STATUSES)],
            'eta' => ['nullable', 'date_format:Y-m-d'],
            'total' => ['nullable'],
            'fee_included' => ['nullable', 'boolean'],
            'tracking_url' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function normalize(array $attributes, PayloadContext $context): array
    {
        return array_filter([
            'order_ref' => ltrim(trim($attributes['order_ref']), '#'),
            'status' => $attributes['status'],
            'eta' => $attributes['eta'] ?? null,
            'total' => Money::normalize($attributes['total'] ?? null),
            'fee_included' => ($attributes['fee_included'] ?? false) ? true : null,
            'tracking_url' => filled($attributes['tracking_url'] ?? null) ? Action::url($attributes['tracking_url']) : null,
        ], fn (mixed $value) => $value !== null);
    }

    public function plainText(?string $content, array $attributes, ?string $pageUrl = null): string
    {
        $total = $attributes['total'] ?? null;

        return self::lines([
            $content,
            $this->previewText(null, $attributes),
            isset($attributes['eta']) ? __('messaging.order_status.eta', ['date' => Carbon::parse($attributes['eta'])->format('d/m')]) : null,
            $total === null ? null : __('messaging.order_status.total', ['amount' => Money::format($total['amount'], $total['currency'])]),
            isset($attributes['tracking_url']) ? __('messaging.order_status.tracking', ['url' => $attributes['tracking_url']]) : null,
            $pageUrl,
        ]);
    }

    public function previewText(?string $content, array $attributes): string
    {
        return filled($content) ? trim((string) $content) : __('messaging.order_status.preview', [
            'ref' => $attributes['order_ref'],
            'status' => __("messaging.order_status.statuses.{$attributes['status']}"),
        ]);
    }
}
