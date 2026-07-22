<?php

namespace App\Modules\Automation;

use App\Models\WorkflowRunLog;
use Illuminate\Support\Carbon;

/**
 * Kết quả 1 lần NodeHandler::handle(). Engine đọc field này để quyết định
 * bước tiếp theo — handler không tự set trạng thái WorkflowRun.
 */
final class NodeHandlerResult
{
    private function __construct(
        public readonly string $result,
        public readonly ?string $message = null,
        public readonly ?bool $branch = null,
        public readonly ?Carbon $resumeAt = null,
    ) {}

    /**
     * @param  bool|null  $branch  Chỉ có ý nghĩa với node condition — true/false chọn edge nào.
     * @param  Carbon|null  $resumeAt  Chỉ có ý nghĩa với node wait.
     */
    public static function success(?string $message = null, ?bool $branch = null, ?Carbon $resumeAt = null): self
    {
        return new self(WorkflowRunLog::RESULT_SUCCESS, $message, $branch, $resumeAt);
    }

    public static function failed(string $message): self
    {
        return new self(WorkflowRunLog::RESULT_FAILED, $message);
    }

    /**
     * @param  bool|null  $branch  Node condition: nếu skip xảy ra ở đó (vd: subject bị xoá),
     *                             truyền branch tường minh (thường false — "fail closed", không đi nhánh true khi
     *                             không xác minh được điều kiện). Để trống (null) sẽ khiến engine chọn edge ĐẦU TIÊN
     *                             khớp `from` bất kể branch — chỉ hợp lệ cho node không phải condition (vd: action node
     *                             ở Phase 03 có edge "không branch" duy nhất).
     */
    public static function skipped(string $message, ?bool $branch = null): self
    {
        return new self(WorkflowRunLog::RESULT_SKIPPED, $message, $branch);
    }
}
