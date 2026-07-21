<?php

namespace App\Modules\Automation;

use App\Modules\Automation\Contracts\NodeHandler;
use Illuminate\Support\Manager;

/**
 * Driver-manager cho node type (condition, wait, end, action handlers...).
 * Mirror ChannelManager (app/Modules/Integration/ChannelManager.php) — cùng
 * shape, khác domain. Thêm node-type mới = 1 class + 1 extend(), Engine
 * không đổi.
 */
class NodeHandlerManager extends Manager
{
    /**
     * Trả về NodeHandler theo node type.
     *
     * @throws \InvalidArgumentException nếu handler chưa đăng ký
     */
    public function handler(mixed $type = null): NodeHandler
    {
        /** @var NodeHandler */
        return parent::driver($type);
    }

    public function hasAny(): bool
    {
        return ! empty($this->customCreators);
    }

    /**
     * Manager yêu cầu default driver — trả '' để báo "chưa có default".
     * Caller nên gọi handler('condition')/handler('wait')/... tường minh.
     */
    public function getDefaultDriver(): string
    {
        return '';
    }
}
