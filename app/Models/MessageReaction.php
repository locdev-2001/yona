<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * P01a — reaction per-(message, người thả). Channel-agnostic.
 *
 * Unique (message_id, reactor_uid): mỗi người 1 reaction/tin.
 * Đổi icon = update · NONE = delete · reacted_at monotonic guard (P02).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $message_id
 * @property string $reactor_uid
 * @property string $icon
 * @property Carbon $reacted_at
 */
class MessageReaction extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $fillable = [
        'message_id',
        'reactor_uid',
        'icon',
        'reacted_at',
    ];

    protected function casts(): array
    {
        return [
            'reacted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Message, $this> */
    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }
}
