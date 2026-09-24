<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;

// `class SuperAdmin < User`,
// STI trên cột users.type. Guard `super_admin` dùng model này nên phiên đăng
// nhập console quản trị tách hẳn phiên agent.
class SuperAdmin extends User
{
    public const TYPE = 'SuperAdmin';

    protected $table = 'users';

    protected static function booted(): void
    {
        parent::booted();

        static::addGlobalScope('superAdminType', function (Builder $query) {
            $query->where('users.type', self::TYPE);
        });

        static::creating(function (SuperAdmin $superAdmin) {
            $superAdmin->type = self::TYPE;
        });
    }
}
