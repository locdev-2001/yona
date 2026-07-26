<?php

namespace App\Modules\Identity\Merge;

use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\Profile;
use App\Models\ProfileIdentity;
use Illuminate\Support\Facades\DB;

/**
 * Gộp hai hồ sơ về một.
 *
 * Rẻ được là vì `profiles` không giữ trường cá nhân nào: không có gì để hòa
 * giải, chỉ đổi `profile_id` trên vài hàng.
 *
 * KHÔNG xóa hồ sơ thua. Gộp nhầm hai khách khác nhau là chuyện xảy ra thật, và
 * `merged_into_id` là thứ duy nhất cho phép hoàn tác.
 */
class MergeProfilesService
{
    public function __construct(private readonly ProfileIdentificationService $identification) {}

    public function merge(Profile $winner, Profile $loser): Profile
    {
        if ($winner->is($loser)) {
            return $winner;
        }

        DB::transaction(function () use ($winner, $loser) {
            ProfileIdentity::where('profile_id', $loser->id)->update(['profile_id' => $winner->id]);
            Conversation::where('profile_id', $loser->id)->update(['profile_id' => $winner->id]);
            ConversationMember::where('profile_id', $loser->id)->update(['profile_id' => $winner->id]);

            // Làm phẳng chuỗi: mọi hồ sơ từng trỏ vào kẻ thua nay trỏ thẳng kẻ
            // thắng. Không có bước này thì sau vài tháng, tra một hồ sơ phải lặp
            // nhiều vòng mới ra gốc — và không ai biết cần lặp bao nhiêu vòng.
            Profile::where('merged_into_id', $loser->id)->update(['merged_into_id' => $winner->id]);

            $loser->forceFill(['merged_into_id' => $winner->id])->save();
        });

        $this->identification->refresh($winner);

        return $winner->refresh();
    }

    /**
     * Hồ sơ nào thắng: đã định danh thắng chưa định danh; cùng mức thì cái cũ hơn thắng.
     *
     * @return array{0: Profile, 1: Profile} [thắng, thua]
     */
    public function pickWinner(Profile $a, Profile $b): array
    {
        if ($a->is_identified !== $b->is_identified) {
            return $a->is_identified ? [$a, $b] : [$b, $a];
        }

        return $a->created_at <= $b->created_at ? [$a, $b] : [$b, $a];
    }
}
