<?php

namespace App\Modules\Automation\Handlers;

use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;

/**
 * Kết thúc (flow) — terminal, không delegate service nào.
 */
class EndNodeHandler implements NodeHandler
{
    public function type(): string
    {
        return 'end';
    }

    public function handle(WorkflowRun $run, array $node): NodeHandlerResult
    {
        return NodeHandlerResult::success(message: 'workflow completed');
    }
}
