<?php

namespace App\Models;

use App\Services\Calls\CallMedia;
use App\Services\Calls\CallStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Một đời phòng media. `uuid` là tên phòng phía nhà cung cấp; `kind` là khoá trong sổ loại
// cuộc gọi (config/calls.php), do module sở hữu loại đó tạo dòng.
class Call extends Model
{
    protected $fillable = [
        'uuid', 'kind', 'yona_group_id', 'caller_id', 'callee_id', 'pair_key', 'media', 'status',
        'started_at', 'answered_at', 'ended_at', 'peak_participants',
    ];

    protected function casts(): array
    {
        return [
            'media' => CallMedia::class,
            'status' => CallStatus::class,
            'started_at' => 'datetime',
            'answered_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(YonaGroup::class, 'yona_group_id');
    }

    public function caller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caller_id');
    }

    public function callee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'callee_id');
    }

    /** @return HasMany<CallParticipant, $this> */
    public function participants(): HasMany
    {
        return $this->hasMany(CallParticipant::class);
    }

    /** @return HasMany<CallParticipant, $this> */
    public function presentParticipants(): HasMany
    {
        return $this->participants()->whereNull('left_at');
    }

    /** @param  Builder<self>  $query */
    public function scopeOpen(Builder $query): void
    {
        $query->whereNull('ended_at');
    }

    public function isEnded(): bool
    {
        return $this->ended_at !== null;
    }
}
