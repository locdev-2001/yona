<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

// Việc trong nhóm bị từ chối (không phải thành viên, không có quyền, nhóm đầy…): trả thẳng
// `{error, code}` với mã HTTP đi kèm, để ba mặt tiền route dùng chung một cách báo lỗi.
class GroupActionRejected extends RuntimeException
{
    /** @param  array<string, string|int>  $replace */
    public function __construct(public readonly string $reason, public readonly int $status = 422, array $replace = [])
    {
        parent::__construct(__('groups.ERRORS.'.$reason, $replace));
    }

    public static function forbidden(string $reason): self
    {
        return new self($reason, 403);
    }

    public function render(): JsonResponse
    {
        return response()->json(['error' => $this->getMessage(), 'code' => strtolower($this->reason)], $this->status);
    }
}
