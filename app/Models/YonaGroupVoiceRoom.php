<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Phòng thoại có tên của một nhóm, luôn mở: ai trong nhóm cũng vào được. `name` NULL là phòng
// mặc định (giao diện dịch tên theo người đọc). Cuộc gọi đang diễn ra trong phòng là `openCall`.
class YonaGroupVoiceRoom extends Model
{
    public const NAME_MAX_LENGTH = 60;

    public const MAX_PER_GROUP = 20;

    protected $fillable = ['yona_group_id', 'name', 'position', 'created_by_id', 'open_call_id'];

    /** @return BelongsTo<YonaGroup, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(YonaGroup::class, 'yona_group_id');
    }

    /** @return BelongsTo<Call, $this> */
    public function openCall(): BelongsTo
    {
        return $this->belongsTo(Call::class, 'open_call_id');
    }

    public function liveCall(): ?Call
    {
        $call = $this->openCall;

        return $call === null || $call->isEnded() ? null : $call;
    }
}
