<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * P01 (inbox-multichannel-relayer) — preflight P02(f): ghi nhóm both_have_lead
 * (source + target conv đều có lead khác nhau) để resolve tay. >0 conflict
 * chặn swap unique P02(g). Không FK sang leads/conversations (N1 cross-module).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $channel_account_id
 * @property string $sender_uid
 * @property string $source_conversation_id
 * @property string $target_conversation_id
 * @property string $source_lead_id
 * @property string $target_lead_id
 * @property Carbon $detected_at
 * @property Carbon|null $resolved_at
 * @property string|null $note
 */
class LeadMergeConflict extends Model
{
    use BelongsToWorkspace, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'channel_account_id',
        'sender_uid',
        'source_conversation_id',
        'target_conversation_id',
        'source_lead_id',
        'target_lead_id',
        'detected_at',
        'resolved_at',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'detected_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }
}
