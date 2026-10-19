<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserBlock extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['blocker_id', 'blocked_id'];
}
