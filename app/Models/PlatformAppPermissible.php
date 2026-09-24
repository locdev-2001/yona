<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

// Bản ghi mà một
// platform app được phép thao tác (Account, User, AgentBot).
class PlatformAppPermissible extends Model
{
    protected $fillable = ['platform_app_id', 'permissible_type', 'permissible_id'];

    public function platformApp(): BelongsTo
    {
        return $this->belongsTo(PlatformApp::class);
    }

    public function permissible(): MorphTo
    {
        return $this->morphTo();
    }
}
