<?php

namespace App\Modules\Chat\Delivery;

use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Port\Capability\SupportsSeenReceipts;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Cache;

/**
 * P06b — seen-sync: báo "đã xem" về kênh khi agent mở thread. DEFAULT OFF (A4
 * founder — khách biết shop đã xem = áp lực trả lời, con dao 2 lưỡi). Chỉ
 * tenant.zalo.manage bật; consumer chờ spike rate P09 trước khi khuyến nghị ON.
 *
 * Channel-agnostic: gọi driver.sendSeen qua method_exists (kênh không hỗ trợ →
 * bỏ qua êm). Debounce 4s/(ws,conv) + watermark lastSyncedAt (Cache 1d) — mở
 * thread liên tục không burst API không chính thức (rủi ro #1).
 */
class SeenSyncService
{
    public const SETTING_KEY = 'inbox.send_seen';

    private const DEBOUNCE_SECONDS = 4;

    private const BATCH_LIMIT = 50;

    public function __construct(private readonly SettingsService $settings) {}

    /**
     * Báo-đã-xem bật hay tắt cho MỘT kênh.
     *
     * Per-kênh chứ không phải một công tắc chung: "khách biết shop đã xem" là
     * áp lực trả lời, và mức áp lực đó khác nhau giữa các kênh. Một công tắc
     * chung buộc mọi kênh chịu chung quyết định.
     */
    public function enabled(string $channel): bool
    {
        return (bool) $this->settings->get(self::SETTING_KEY.'.'.$channel, false);
    }

    /**
     * Gọi khi agent mở thread (sau khi response stream đã trả — dispatchAfterResponse).
     * Fail-safe: mọi lỗi nuốt — seen-sync là phụ trợ, không được phá đọc tin.
     */
    public function syncOnThreadOpen(Conversation $conversation): void
    {
        try {
            if (! $this->enabled($conversation->channel) || $conversation->isGroup()) {
                return; // OFF hoặc nhóm (per-member — v1 bỏ)
            }

            // Debounce: Cache::add fail = đã sync trong cửa sổ 4s
            if (! Cache::add('seen-sync:'.$conversation->id, 1, self::DEBOUNCE_SECONDS)) {
                return;
            }

            $watermarkKey = 'seen-sync-last:'.$conversation->id;
            $lastSyncedAt = Cache::get($watermarkKey);

            $query = Message::where('conversation_id', $conversation->id)
                ->where('direction', 'in')
                ->whereNull('recalled_at')
                ->orderByDesc('created_at')
                ->limit(self::BATCH_LIMIT);
            if ($lastSyncedAt !== null) {
                $query->where('created_at', '>', $lastSyncedAt);
            }

            $messages = $query->get();

            if ($messages->isEmpty()) {
                return;
            }

            $driver = app(ChannelRegistry::class)->driver($conversation->channel);
            if (! $driver instanceof SupportsSeenReceipts) {
                return; // kênh không hỗ trợ — không phải lỗi
            }

            // Truyền nguyên Message xuống driver: lõi chọn TIN NÀO cần báo, việc
            // bóc metadata nền tảng là ruột của kênh nên không leo lên đây.
            if ($driver->sendSeen($conversation, $messages)) {
                Cache::put($watermarkKey, now()->toDateTimeString(), now()->addDay());
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
