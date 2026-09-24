<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Bảng nối một chiều
// giữa hai category (A liên quan B không kéo theo B liên quan A).
class RelatedCategory extends Model
{
    protected $fillable = ['category_id', 'related_category_id'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function relatedCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'related_category_id');
    }
}
