<?php

namespace App\Services\Admin\Metrics;

use App\Services\Admin\Metrics\Widgets\ActivationFunnelWidget;
use App\Services\Admin\Metrics\Widgets\ConversationsByChannelWidget;
use App\Services\Admin\Metrics\Widgets\KpisWidget;
use App\Services\Admin\Metrics\Widgets\MessagesTrendWidget;
use App\Services\Admin\Metrics\Widgets\QueueHealthWidget;
use App\Services\Admin\Metrics\Widgets\RecentSignupsWidget;
use App\Services\Admin\Metrics\Widgets\SignupsTrendWidget;
use App\Services\Admin\Metrics\Widgets\StickersWidget;
use App\Services\Admin\Metrics\Widgets\SystemWidget;
use App\Services\Admin\Metrics\Widgets\TopAccountsWidget;

// Danh mục ô của trang Tổng quan. Thứ tự ở đây là bố cục mặc định.
// Thêm ô = viết một lớp trong Widgets/ rồi khai một dòng ở đây.
final class WidgetCatalog
{
    public const CHANNEL_HEALTH = 'channel_health';

    public const OPERATION_LINKS = 'operation_links';

    /** @return list<DashboardWidget> */
    public static function widgets(): array
    {
        return [
            app(KpisWidget::class),
            app(MessagesTrendWidget::class),
            app(ConversationsByChannelWidget::class),
            new ClientSourcedWidget(self::CHANNEL_HEALTH, WidgetSize::Medium),
            new ClientSourcedWidget(self::OPERATION_LINKS, WidgetSize::Medium),
            app(ActivationFunnelWidget::class),
            app(SignupsTrendWidget::class),
            app(TopAccountsWidget::class),
            app(RecentSignupsWidget::class),
            app(QueueHealthWidget::class),
            app(StickersWidget::class),
            app(SystemWidget::class),
        ];
    }
}
