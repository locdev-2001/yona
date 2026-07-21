<?php

namespace App\Modules\Automation\Contracts;

use App\Models\WorkflowRun;
use App\Modules\Automation\NodeHandlerResult;

/**
 * Contract cho 1 node type trong graph (Manager pattern, như ChannelDriver).
 *
 * Node Handler layer dịch config node → gọi 1 service thật (Phase 03) hoặc
 * xử lý control-flow nội bộ (condition/wait/end, Phase 02). Engine không biết
 * nghĩa business của node — chỉ gọi handle() rồi đọc kết quả để đi tiếp.
 */
interface NodeHandler
{
    /**
     * Key định danh node type (vd: 'condition', 'wait', 'send_message').
     */
    public function type(): string;

    /**
     * Xử lý 1 node cho 1 WorkflowRun. Gọi đúng 1 lần mỗi lần node này thành
     * "current node" (ngoại lệ: node 'wait' không được gọi lại khi resume —
     * xem WorkflowEngine::advance()).
     *
     * @param  array<string, mixed>  $node  {id, type, config}
     */
    public function handle(WorkflowRun $run, array $node): NodeHandlerResult;
}
