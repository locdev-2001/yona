<?php

namespace App\Agent\Contracts\Extensions;

use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;

// Một công cụ mô hình gọi được. Thêm công cụ = thêm một hiện thực và đăng ký ở Kernel.
// Sai tham số trả ToolResult::failure kèm hướng sửa, không ném ngoại lệ.
interface Tool
{
    public function spec(): ToolSpec;

    public function run(ToolCall $call, TurnContext $context): ToolResult;
}
