<?php

namespace App\Exceptions\Conversations;

use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

// AI agent của hội thoại đang giữ quyền nói: tin công khai của người bị từ chối với
// mã `floor_held`, ghi chú riêng vẫn qua.
final class ConversationFloorHeld extends HttpException
{
    public const CODE = 'floor_held';

    public function __construct(public readonly CarbonInterface $heldUntil)
    {
        parent::__construct(409, __('errors.conversations.floor_held'));
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => self::CODE,
            'message' => $this->getMessage(),
            'floor_held_until' => $this->heldUntil->toISOString(),
        ], 409);
    }
}
