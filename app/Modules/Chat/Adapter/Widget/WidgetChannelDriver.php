<?php

namespace App\Modules\Chat\Adapter\Widget;

use App\Enums\TenantPermission;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Adapter\Widget\Intake\WidgetInboundParser;
use App\Modules\Chat\Delivery\Event\OutboundEvent;
use App\Modules\Chat\Delivery\Event\OutboundEventType;
use App\Modules\Chat\Port\AbstractChannelDriver;
use App\Modules\Chat\Port\ChannelDescriptor;
use Illuminate\Support\Str;

/**
 * Kênh nội bộ — cái đế của cả module chat, không phải một tích hợp.
 *
 * Gỡ hết phích cắm bên ngoài ra thì vẫn chat được qua kênh này. Nó là driver
 * thật, đi CHUNG một đường với Zalo: nếu lõi phải biết "trường hợp không có
 * driver thì xử khác đi", đó chính là rẽ nhánh theo kênh trong lõi — vi phạm
 * thẳng luật bất biến #1.
 *
 * Một `channel_accounts` với `channel='widget'` = một widget (xem P7). Nhiều
 * widget mỗi workspace là chuyện bình thường, khóa unique sẵn có đã cho.
 */
class WidgetChannelDriver extends AbstractChannelDriver
{
    public const KEY = 'widget';

    public function __construct(private readonly WidgetInboundParser $parser) {}

    public function descriptor(): ChannelDescriptor
    {
        return self::descriptorOf();
    }

    /**
     * Danh tính của kênh là HẰNG, không phụ thuộc instance — provider khai nó
     * mà không phải dựng cả chuỗi phụ thuộc của driver.
     */
    public static function descriptorOf(): ChannelDescriptor
    {
        return new ChannelDescriptor(
            key: self::KEY,
            label: 'Kênh nội bộ',
            category: 'chat',
            logo: '/assets/images/icon_widget.png',
            badge: 'W',
            // Kênh nội bộ không có trang kết nối: nó luôn sẵn sàng, không có
            // phiên nào để dựng. Giao diện phải ẩn nút thay vì gọi route().
            connectRouteName: null,
            managePermission: TenantPermission::ChannelManage,
        );
    }

    /**
     * Kênh của chính ta nên render được mọi thứ — đây là nơi mô hình sự kiện
     * chạy hết công suất, và cũng là thước đo xem nó có thật sự dùng được không.
     *
     * @return list<OutboundEventType>
     */
    public function supportedOutboundEvents(): array
    {
        return OutboundEventType::cases();
    }

    /**
     * Không có transport ra ngoài: LƯU TRỮ CHÍNH LÀ GIAO HÀNG.
     *
     * Đây không phải no-op giả. Người nhận (widget) lấy tin qua websocket sau
     * bước publish của pipeline, nên tin được coi là đã gửi ngay khi nằm trong
     * DB — đúng như tin Zalo được coi là đã gửi khi bridge trả 2xx.
     *
     * @param  array<string, mixed>  $payload
     */
    public function sendMessage(Conversation $conversation, array $payload): Message
    {
        $events = OutboundEvent::listFromArray((array) ($payload['events'] ?? []));
        $body = $payload['text'] ?? ($events === [] ? null : OutboundEvent::flatten($events));

        $message = Message::create([
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'direction' => 'out',
            'type' => 'text',
            'body' => $body,
            'source_id' => 'widget_'.Str::uuid()->toString(),
            'platform_sent_at' => now(),
            'sent_by' => $payload['sent_by'] ?? null,
        ]);

        Conversation::where('id', $conversation->id)->increment('stream_version');

        return $message;
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    public function parseInbound(array $raw): array
    {
        return $this->parser->parse($raw);
    }
}
