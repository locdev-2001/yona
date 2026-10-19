<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

// Quan hệ bạn bè giữa hai người dùng Yona, một dòng cho mỗi cặp. 'pending' là lời mời
// requester gửi addressee đang chờ trả lời; 'accepted' là hai người đã là bạn bè.
class Friendship extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    protected $fillable = ['requester_id', 'addressee_id', 'status', 'accepted_at'];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
        ];
    }

    // Thông báo trỏ vào lời mời không còn ý nghĩa khi lời mời biến mất.
    protected static function booted(): void
    {
        static::deleting(function (Friendship $friendship) {
            $friendship->notifications()->get()->each(fn (Notification $notification) => $notification->delete());
        });
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function addressee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'addressee_id');
    }

    public function notifications(): MorphMany
    {
        return $this->morphMany(Notification::class, 'primary_actor');
    }

    public function scopeInvolving(Builder $query, int $userId): Builder
    {
        return $query->where(fn (Builder $either) => $either->where('requester_id', $userId)->orWhere('addressee_id', $userId));
    }

    public function scopeBetween(Builder $query, int $userId, int $otherUserId): Builder
    {
        return $query->where(fn (Builder $pair) => $pair
            ->where(fn (Builder $forward) => $forward->where('requester_id', $userId)->where('addressee_id', $otherUserId))
            ->orWhere(fn (Builder $reverse) => $reverse->where('requester_id', $otherUserId)->where('addressee_id', $userId)));
    }

    public function scopeAccepted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACCEPTED);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function isAccepted(): bool
    {
        return $this->status === self::STATUS_ACCEPTED;
    }

    public function involves(User $user): bool
    {
        return in_array($user->id, [$this->requester_id, $this->addressee_id], true);
    }

    public function otherUserId(User $user): int
    {
        return $this->requester_id === $user->id ? $this->addressee_id : $this->requester_id;
    }
}
