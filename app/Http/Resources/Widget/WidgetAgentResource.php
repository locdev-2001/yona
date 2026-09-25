<?php

namespace App\Http\Resources\Widget;

use App\Models\User;

// Một nhân viên nhìn từ widget: đúng những trường khách được thấy, kèm trạng thái trực
// của người đó trong account. Dùng chung cho danh sách thành viên hộp thư và nhân viên
// phụ trách hội thoại (người được gán có thể không là thành viên hộp thư).
final class WidgetAgentResource
{
    /** @return array{id: int, name: string, avatar_url: string, availability_status: string|null} */
    public static function make(User $agent, int $accountId): array
    {
        return [
            'id' => $agent->id,
            'name' => $agent->availableName(),
            'avatar_url' => $agent->avatarUrl(),
            'availability_status' => $agent->accountUsers
                ->firstWhere('account_id', $accountId)
                ?->availabilityStatus(),
        ];
    }
}
