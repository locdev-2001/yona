<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

// Việc trong cuộc gọi bị từ chối (không thuộc cuộc gọi, không có quyền điều hành, đã kết
// thúc): trả `{error, code}` giống GroupActionRejected để ba mặt tiền route dùng chung.
class CallActionRejected extends RuntimeException
{
    /** @param  array<string, string|int>  $replace */
    public function __construct(public readonly string $reason, public readonly int $status = 422, array $replace = [])
    {
        parent::__construct(__('calls.ERRORS.'.$reason, $replace));
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
