<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;

class Attachment extends Model
{
    public const FILE_TYPE_IMAGE = 0;

    public const FILE_TYPE_AUDIO = 1;

    public const FILE_TYPE_VIDEO = 2;

    public const FILE_TYPE_FILE = 3;

    protected $fillable = [
        'account_id',
        'file_type',
        'extension',
        'external_url',
        'fallback_title',
        'meta',
        'disk',
        'path',
        'filename',
        'content_type',
        'byte_size',
    ];

    protected $attributes = [
        'disk' => 'public',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::deleted(function (Attachment $attachment) {
            if ($attachment->path) {
                Storage::disk($attachment->disk)->delete($attachment->path);
            }
        });
    }

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    public function url(): ?string
    {
        if ($this->external_url) {
            return $this->external_url;
        }

        return $this->path ? Storage::disk($this->disk)->url($this->path) : null;
    }
}
