<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một thao tác ghi của super admin trong console. Chỉ thêm, không sửa: payload
// đã che bí mật trước khi ghi (SensitiveFields).
class SuperAdminAuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'super_admin_id',
        'super_admin_email',
        'action',
        'subject_type',
        'subject_id',
        'changes',
        'response_status',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'changes' => 'array',
    ];

    public function superAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'super_admin_id');
    }
}
