<?php

namespace App\Services\Admin\Metrics;

use App\Services\Admin\Metrics\Widgets\ActivationFunnelWidget;
use App\Services\Admin\Metrics\Widgets\AlertsWidget;
use App\Services\Admin\Metrics\Widgets\ChannelHealthWidget;
use App\Services\Admin\Metrics\Widgets\CohortRetentionWidget;
use App\Services\Admin\Metrics\Widgets\ConversationsByChannelWidget;
use App\Services\Admin\Metrics\Widgets\KpisWidget;
use App\Services\Admin\Metrics\Widgets\MessagesTrendWidget;
use App\Services\Admin\Metrics\Widgets\QueueHealthWidget;
use App\Services\Admin\Metrics\Widgets\RecentSignupsWidget;
use App\Services\Admin\Metrics\Widgets\SignupsTrendWidget;
use App\Services\Admin\Metrics\Widgets\StickersWidget;
use App\Services\Admin\Metrics\Widgets\SystemWidget;
use App\Services\Admin\Metrics\Widgets\TopAccountsWidget;

// Danh mục ô của trang Tổng quan. Thứ tự ở đây là bố cục mặc định: mỗi hàng của lưới 4 cột
// lấp đủ 4 cột (lg+sm, md+md, sm×4, full) và ghép các ô cao gần bằng nhau để không thủng lưới.
// Thêm ô = viết một lớp trong Widgets/ rồi khai một dòng ở đây.
final class WidgetCatalog
{
    public const OPERATION_LINKS = 'operation_links';

    /** @return list<DashboardWidget> */
    public static function widgets(): array
    {
        return [
            app(KpisWidget::class),
            app(MessagesTrendWidget::class),
            app(ConversationsByChannelWidget::class),
            app(ActivationFunnelWidget::class),
            app(SignupsTrendWidget::class),
            app(CohortRetentionWidget::class),
            app(ChannelHealthWidget::class),
            app(TopAccountsWidget::class),
            app(RecentSignupsWidget::class),
            app(AlertsWidget::class),
            app(QueueHealthWidget::class),
            app(StickersWidget::class),
            app(SystemWidget::class),
            new ClientSourcedWidget(self::OPERATION_LINKS, WidgetSize::Full),
        ];
    }
}
