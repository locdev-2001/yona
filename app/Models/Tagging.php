<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Thay bảng taggings của gem acts_as_taggable_on: chỉ nối một nhãn với một bản
// ghi trong cùng account (bỏ tag_id tự do, tagger, context đa ngữ cảnh).
class Tagging extends Model
{
    protected $fillable = [
        'account_id',
        'label_id',
        'taggable_type',
        'taggable_id',
    ];

    public function label(): BelongsTo
    {
        return $this->belongsTo(Label::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
