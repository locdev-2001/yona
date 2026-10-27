<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\YonaGroup;
use App\Models\YonaGroupVoiceRoom;
use App\Services\Groups\Calls\GroupVoiceRooms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Danh sách phòng thoại có tên của nhóm: quản trị tạo, đổi tên, xoá. Thành viên xem phòng và ai
// đang ngồi qua payload nhóm (`voice_rooms`) hoặc GET …/call.
class YonaGroupVoiceRoomsController extends Controller
{
    public function __construct(private readonly GroupVoiceRooms $rooms) {}

    public function store(Request $request, Account $account, int $groupId): JsonResponse
    {
        $input = $request->validate(['name' => ['required', 'string']]);
        $room = $this->rooms->create(YonaGroup::query()->findOrFail($groupId), $request->user(), $input['name']);

        return response()->json($this->present($room), 201);
    }

    public function update(Request $request, Account $account, int $groupId, int $roomId): JsonResponse
    {
        $input = $request->validate(['name' => ['required', 'string']]);
        $room = $this->rooms->rename(YonaGroup::query()->findOrFail($groupId), $request->user(), $roomId, $input['name']);

        return response()->json($this->present($room));
    }

    public function destroy(Request $request, Account $account, int $groupId, int $roomId): Response
    {
        $this->rooms->delete(YonaGroup::query()->findOrFail($groupId), $request->user(), $roomId);

        return response()->noContent();
    }

    /** @return array{id: int, name: string|null} */
    private function present(YonaGroupVoiceRoom $room): array
    {
        return ['id' => $room->id, 'name' => $room->name];
    }
}
