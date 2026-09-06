<?php

namespace App\Services\Zalo;

/**
 * Nơi DUY NHẤT biết hình dạng các "thẻ" riêng của Zalo (danh thiếp, thẻ ngân
 * hàng, nhắc hẹn, cuộc gọi, lời mời kết bạn) — cùng vai trò với RelayEventParser
 * ở nhánh sự kiện.
 *
 * Lõi Chatwoot không có content_type cho những loại này, và bảng
 * `Message::CONTENT_TYPES` là enum dùng chung với API/webhook nên không tự ý nới.
 * Bản gốc xử lý đúng tình huống đó bằng `content_attributes` + bubble riêng
 * (`Message.vue`: `contentAttributes.whatsappFlowResponse`, `contentAttributes.type === 'dyte'`,
 * `contentAttributes.imageType` cho story Instagram) — driver Zalo đi theo lối này:
 * dữ liệu chuẩn hoá nằm ở `content_attributes.<kind>`, còn `content` giữ một nhãn
 * đọc được để card hội thoại / tìm kiếm / webhook không rỗng.
 */
class InboundCardParser
{
    /** Khóa dịch nhãn dự phòng, dùng chung cho mọi kind trừ nhắc hẹn (lấy tiêu đề thật). */
    private const LABEL_KEYS = [
        'business_card' => 'conversations.messages.business_card',
        'bank_card' => 'conversations.messages.bank_card',
        'reminder' => 'conversations.messages.reminder',
        'call' => 'conversations.messages.call',
        'friend_request' => 'conversations.messages.friend_request',
    ];

    /** Bridge gửi sẵn các kind này thành object cùng tên trong payload. */
    private const PASSTHROUGH_KINDS = ['business_card', 'bank_card', 'call', 'friend_request'];

    private const REMINDER_MSG_TYPE = 'chat.ecard';

    /**
     * Zalo gửi HAI tin `chat.ecard` cho một nhắc hẹn: lúc tạo (`create_reminder…`)
     * và lúc tới giờ (`remind_reminder…`, bằng chứng: tin 804 trong
     * reports/g1-inbound-evidence.md §5). Cả hai về cùng một thẻ.
     *
     * @var list<string>
     */
    private const REMINDER_ACT_PREFIXES = ['create_reminder', 'remind_reminder'];

    /**
     * @param  array<string, mixed>  $params  payload `inbound` của bridge
     * @return array{kind: string, data: array<string, mixed>}|null
     */
    public static function parse(array $params): ?array
    {
        foreach (self::PASSTHROUGH_KINDS as $kind) {
            if (filled($params[$kind] ?? null) && is_array($params[$kind])) {
                return ['kind' => $kind, 'data' => $params[$kind]];
            }
        }

        $reminder = self::reminder($params);

        return $reminder === null ? null : ['kind' => 'reminder', 'data' => $reminder];
    }

    /**
     * Nhãn hiển thị ở card hội thoại / tìm kiếm / webhook. Nhắc hẹn dùng chính
     * tiêu đề khách đặt (Zalo cũng hiện tiêu đề), các loại còn lại dùng chuỗi dịch.
     *
     * @param  array<string, mixed>  $data
     */
    public static function label(string $kind, array $data, ?string $locale = null): string
    {
        $title = $kind === 'reminder' ? trim((string) ($data['title'] ?? '')) : '';

        return $title !== '' ? $title : __(self::LABEL_KEYS[$kind], [], $locale);
    }

    /**
     * Bridge chưa có `inbound_kind: reminder` — tin nhắc hẹn đến dưới dạng
     * `chat.ecard` và rơi vào nhánh text, cho ra chuỗi "[Link] ⏰ … .png". Dựng
     * lại thẻ từ chính `listener_data` bridge đã gửi kèm nên không phải sửa/khởi
     * động lại bridge.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>|null
     */
    private static function reminder(array $params): ?array
    {
        $listenerData = is_array($params['listener_data'] ?? null) ? $params['listener_data'] : [];
        $msgType = (string) ($listenerData['msgType'] ?? $params['msg_type'] ?? '');
        $content = is_array($listenerData['content'] ?? null) ? $listenerData['content'] : [];

        if ($msgType !== self::REMINDER_MSG_TYPE || $content === []) {
            return null;
        }

        $action = self::reminderAction(self::decodeJson($content['params'] ?? null));

        if ($action === null) {
            return null;
        }

        return array_filter([
            'title' => self::firstFilled($action['params']['title'] ?? null, $content['title'] ?? null),
            // Zalo dựng sẵn chuỗi ngày giờ theo tiếng của người gửi ("Thứ Hai, 7
            // tháng 9 lúc 00:49") — dùng lại thay vì tự định dạng khác đi.
            'description' => $content['description'] ?? null,
            'emoji' => $action['emoji'] ?? null,
            'start_time' => isset($action['startTime']) ? (int) $action['startTime'] : null,
            'reminder_id' => isset($action['reminderId']) ? (string) $action['reminderId'] : null,
            'repeat' => isset($action['repeat']) ? (int) $action['repeat'] : null,
        ], fn ($value) => $value !== null && $value !== '');
    }

    /**
     * `content.params` là JSON lồng nhiều tầng: params.actions[].data là JSON
     * chứa `{act: "create_reminder11", data: "<JSON thẻ nhắc hẹn>"}`.
     *
     * @param  array<string, mixed>|null  $params
     * @return array<string, mixed>|null
     */
    private static function reminderAction(?array $params): ?array
    {
        foreach ($params['actions'] ?? [] as $action) {
            $envelope = self::decodeJson(is_array($action) ? ($action['data'] ?? null) : null);

            if ($envelope === null || ! self::isReminderAct((string) ($envelope['act'] ?? ''))) {
                continue;
            }

            $reminder = self::decodeJson($envelope['data'] ?? null);

            if ($reminder !== null) {
                return $reminder;
            }
        }

        return null;
    }

    private static function isReminderAct(string $act): bool
    {
        foreach (self::REMINDER_ACT_PREFIXES as $prefix) {
            if (str_starts_with($act, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /** @return array<string, mixed>|null */
    private static function decodeJson(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : null;
    }

    private static function firstFilled(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }
}
