<?php

namespace App\Services\Admin\Alerts;

use App\Models\AlertIncident;
use App\Models\AlertRule;
use App\Support\SuperAdminArea;
use Carbon\CarbonInterface;

// Câu chữ của một thông báo cảnh báo, dựng một lần rồi dùng chung cho thư và đẩy.
final readonly class AlertMessage
{
    public const DISPLAY_TIMEZONE = 'Asia/Ho_Chi_Minh';

    /** @param  list<string>  $lines */
    public function __construct(
        public string $subject,
        public string $title,
        public array $lines,
        public string $actionLabel,
        public string $actionUrl,
        public string $manageUrl,
        public string $tag,
    ) {}

    public static function opened(AlertRule $rule, AlertMetric $metric, AlertIncident $incident): self
    {
        $name = self::ruleTitle($rule->key);

        return new self(
            subject: __('admin_alerts.MAIL.OPENED_SUBJECT', ['rule' => $name]),
            title: __('admin_alerts.MAIL.OPENED_TITLE'),
            lines: [
                $metric->unit() === MetricUnit::State
                    ? __('admin_alerts.MAIL.OPENED_STATE', ['rule' => $name, 'description' => __("admin_alerts.RULES.{$rule->key}.DESCRIPTION")])
                    : __('admin_alerts.MAIL.OPENED_VALUE', [
                        'rule' => $name,
                        'value' => AlertValues::format($metric->unit(), $incident->last_value),
                        'threshold' => AlertValues::format($metric->unit(), $incident->threshold),
                    ]),
                __('admin_alerts.MAIL.OPENED_AT', ['time' => self::time($incident->opened_at)]),
            ],
            actionLabel: __('admin_alerts.MAIL.ACTION'),
            actionUrl: url($metric->url()),
            manageUrl: url(SuperAdminArea::url('alerts')),
            tag: "admin_alert_{$rule->key}",
        );
    }

    public static function resolved(AlertRule $rule, AlertMetric $metric, AlertIncident $incident): self
    {
        $name = self::ruleTitle($rule->key);

        return new self(
            subject: __('admin_alerts.MAIL.RESOLVED_SUBJECT', ['rule' => $name]),
            title: __('admin_alerts.MAIL.RESOLVED_TITLE'),
            lines: [
                $metric->unit() === MetricUnit::State
                    ? __('admin_alerts.MAIL.RESOLVED_STATE', ['rule' => $name])
                    : __('admin_alerts.MAIL.RESOLVED_VALUE', [
                        'rule' => $name,
                        'value' => AlertValues::format($metric->unit(), $incident->last_value),
                        'threshold' => AlertValues::format($metric->unit(), $incident->threshold),
                    ]),
                __('admin_alerts.MAIL.RESOLVED_DURATION', [
                    'from' => self::time($incident->opened_at),
                    'to' => self::time($incident->resolved_at),
                ]),
            ],
            actionLabel: __('admin_alerts.MAIL.ACTION'),
            actionUrl: url($metric->url()),
            manageUrl: url(SuperAdminArea::url('alerts')),
            tag: "admin_alert_{$rule->key}",
        );
    }

    public static function test(): self
    {
        $manageUrl = url(SuperAdminArea::url('alerts'));

        return new self(
            subject: __('admin_alerts.MAIL.TEST_SUBJECT'),
            title: __('admin_alerts.MAIL.TEST_TITLE'),
            lines: [__('admin_alerts.MAIL.TEST_BODY')],
            actionLabel: __('admin_alerts.MAIL.TEST_ACTION'),
            actionUrl: $manageUrl,
            manageUrl: $manageUrl,
            tag: 'admin_alert_test',
        );
    }

    public static function ruleTitle(string $key): string
    {
        $translationKey = "admin_alerts.RULES.{$key}.TITLE";
        $title = __($translationKey);

        return $title === $translationKey ? $key : (string) $title;
    }

    private static function time(?CarbonInterface $time): string
    {
        return $time === null ? '' : $time->copy()->setTimezone(self::DISPLAY_TIMEZONE)->format('H:i d/m/Y');
    }
}
