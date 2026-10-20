<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CallResource;
use App\Models\Account;
use App\Models\YonaGroup;
use App\Services\Calls\CallMedia;
use App\Services\Calls\GroupRooms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Phòng thoại nhóm: vào phòng (mở phòng nếu chưa có) và nhận vé kết nối.
class YonaGroupCallsController extends Controller
{
    public function __construct(private readonly GroupRooms $groupRooms) {}

    public function store(Request $request, Account $account, int $groupId): JsonResponse
    {
        $input = $request->validate([
            'media' => ['sometimes', Rule::enum(CallMedia::class)],
        ]);

        $join = $this->groupRooms->join(
            YonaGroup::query()->findOrFail($groupId),
            $request->user(),
            CallMedia::tryFrom($input['media'] ?? '') ?? CallMedia::Audio,
        );

        return response()->json([
            'call' => CallResource::from($join->call),
            'ticket' => $join->ticket->toArray(),
        ]);
    }
}
