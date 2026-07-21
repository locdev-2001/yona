<?php

namespace App\Services\Inbox;

use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Integration\ChannelManager;
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

    public function enabled(): bool
    {
        return (bool) $this->settings->get(self::SETTING_KEY, false);
    }

    /**
     * Gọi khi agent mở thread (sau khi response stream đã trả — dispatchAfterResponse).
     * Fail-safe: mọi lỗi nuốt — seen-sync là phụ trợ, không được phá đọc tin.
     */
    public function syncOnThreadOpen(Conversation $conversation): void
    {
        try {
            if (! $this->enabled() || $conversation->thread_type === 1) {
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

            $platformMessages = $query->get()
                ->pluck('platform_meta.zca_message')
                ->filter(fn ($zca) => is_array($zca) && $zca !== [])
                ->values()
                ->all();

            if ($platformMessages === []) {
                return;
            }

            if (! class_exists(ChannelManager::class)) {
                return;
            }
            $driver = app(ChannelManager::class)->driver($conversation->channel);
            if (! method_exists($driver, 'sendSeen')) {
                return; // kênh không hỗ trợ — không phải lỗi
            }

            if ($driver->sendSeen($conversation, $platformMessages)) {
                Cache::put($watermarkKey, now()->toDateTimeString(), now()->addDay());
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
