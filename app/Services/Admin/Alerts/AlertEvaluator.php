<?php

namespace App\Services\Admin\Alerts;

use App\Models\AlertIncident;
use App\Models\AlertRule;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Một lượt đánh giá mọi luật cảnh báo (lệnh alerts:evaluate, 5 phút một lần).
 *
 * - Vượt ngưỡng (giá trị >= ngưỡng) mà chưa có sự cố mở thì mở sự cố. Chỉ số dạng
 *   Sustain phải vượt liên tục đủ cửa sổ mới mở.
 * - Mỗi sự cố báo ĐÚNG MỘT lần. Lần báo trước của cùng luật còn trong thời gian chờ
 *   thì sự cố mới chưa báo; còn mở khi hết thời gian chờ thì báo lúc đó.
 * - Về dưới ngưỡng thì đóng sự cố, và báo "đã hồi phục" nếu sự cố đó đã được báo.
 * - Luật tắt: không đo, sự cố đang mở được đóng lặng lẽ.
 * - Nguồn số liệu lỗi: bỏ qua lượt đó, giữ nguyên trạng thái.
 */
class AlertEvaluator
{
    private const SCHEDULE_JITTER_SECONDS = 60;

    public function __construct(
        private readonly AlertMetrics $metrics,
        private readonly AlertNotifier $notifier,
    ) {}

    /** @return list<array{key: string, status: string, value: int|null}> */
    public function evaluate(): array
    {
        $results = [];

        foreach ($this->metrics->rules() as $key => $rule) {
            $metric = $this->metrics->find($key);

            if ($metric !== null) {
                $results[] = ['key' => $key, ...$this->evaluateRule($rule, $metric)];
            }
        }

        return $results;
    }

    /** @return array{status: string, value: int|null} */
    public function evaluateRule(AlertRule $rule, AlertMetric $metric): array
    {
        if (! $rule->enabled) {
            $this->closeSilently($rule);

            return ['status' => 'disabled', 'value' => null];
        }

        try {
            $value = $metric->measure($rule->window_minutes);
        } catch (Throwable $exception) {
            Log::warning('[ALERT] Không đo được chỉ số cảnh báo', ['rule' => $rule->key, 'error' => $exception->getMessage()]);

            return ['status' => 'unavailable', 'value' => null];
        }

        $now = now();
        $breaching = $value >= $rule->threshold;

        $rule->forceFill([
            'last_value' => $value,
            'last_evaluated_at' => $now,
            'breaching_since' => $breaching ? ($rule->breaching_since ?? $now) : null,
        ])->save();

        $incident = $rule->openIncident()->first();

        if (! $breaching) {
            if ($incident !== null) {
                $this->resolve($rule, $metric, $incident, $value);

                return ['status' => 'resolved', 'value' => $value];
            }

            return ['status' => 'ok', 'value' => $value];
        }

        if ($incident !== null) {
            $incident->forceFill(['last_value' => $value, 'peak_value' => max($incident->peak_value, $value)])->save();
            $this->notifyIfDue($rule, $metric, $incident);

            return ['status' => 'firing', 'value' => $value];
        }

        if (! $this->sustainedLongEnough($rule, $metric)) {
            return ['status' => 'pending', 'value' => $value];
        }

        $incident = $rule->incidents()->create([
            'value' => $value,
            'peak_value' => $value,
            'last_value' => $value,
            'threshold' => $rule->threshold,
            'opened_at' => $now,
        ]);
        $this->notifyIfDue($rule, $metric, $incident);

        return ['status' => 'opened', 'value' => $value];
    }

    private function sustainedLongEnough(AlertRule $rule, AlertMetric $metric): bool
    {
        if ($metric->windowMode() === WindowMode::Lookback || $rule->window_minutes <= 0) {
            return true;
        }

        // Lịch chạy lệch vài giây giữa các lượt: cho dư một phút để cửa sổ 10 phút
        // mở ở lượt thứ ba (phút 10), không trượt sang lượt thứ tư.
        return $rule->breaching_since !== null
            && $rule->breaching_since->lte(now()->subMinutes($rule->window_minutes)->addSeconds(self::SCHEDULE_JITTER_SECONDS));
    }

    private function notifyIfDue(AlertRule $rule, AlertMetric $metric, AlertIncident $incident): void
    {
        if ($incident->notified_at !== null || $this->inCooldown($rule)) {
            return;
        }

        // Ghi mốc trước khi gửi: lượt sau chạy chồng (hoặc gửi treo) không báo lần hai.
        $claimed = AlertIncident::query()
            ->whereKey($incident->id)
            ->whereNull('notified_at')
            ->update(['notified_at' => now()]);

        if ($claimed === 0) {
            return;
        }

        $incident->refresh();
        $this->notifier->toAllSuperAdmins(AlertMessage::opened($rule, $metric, $incident));
    }

    private function inCooldown(AlertRule $rule): bool
    {
        $lastNotifiedAt = $rule->incidents()->max('notified_at');

        return $lastNotifiedAt !== null
            && now()->subMinutes($rule->cooldown_minutes)->lt($lastNotifiedAt);
    }

    private function resolve(AlertRule $rule, AlertMetric $metric, AlertIncident $incident, int $value): void
    {
        $now = now();
        $notify = $incident->notified_at !== null;

        $incident->forceFill([
            'last_value' => $value,
            'resolved_at' => $now,
            'recovery_notified_at' => $notify ? $now : null,
        ])->save();

        if ($notify) {
            $this->notifier->toAllSuperAdmins(AlertMessage::resolved($rule, $metric, $incident));
        }
    }

    private function closeSilently(AlertRule $rule): void
    {
        $rule->openIncident()->first()?->forceFill(['resolved_at' => now()])->save();

        if ($rule->breaching_since !== null) {
            $rule->forceFill(['breaching_since' => null])->save();
        }
    }
}
