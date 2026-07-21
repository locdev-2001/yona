<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * P01b/P07 — canned reply per-workspace (channel-agnostic).
 * Placeholder `{ten_khach}` được composer FE thay bằng peer_name lúc chèn.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $title
 * @property string $body
 * @property int|null $created_by
 */
class QuickReply extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $fillable = [
        'title',
        'body',
        'created_by',
    ];
}
