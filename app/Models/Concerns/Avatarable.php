<?php

namespace App\Models\Concerns;

use App\Models\Attachment;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

// Tương đương concern Avatarable của Chatwoot: mọi model có avatar
// (User, Inbox…) dùng chung một chỗ gắn/thay/đọc URL.
trait Avatarable
{
    public function avatar(): MorphOne
    {
        return $this->morphOne(Attachment::class, 'attachable');
    }

    public function avatarUrl(): string
    {
        return $this->avatar?->url() ?? '';
    }

    public function replaceAvatar(UploadedFile $file): void
    {
        $this->avatar?->delete();

        $this->avatar()->create([
            'account_id' => $this->account_id ?? null,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'extension' => $file->extension(),
            'filename' => $file->getClientOriginalName(),
            'content_type' => $file->getMimeType(),
            'byte_size' => $file->getSize(),
            'path' => $file->store(sprintf('avatars/%s/%d', Str::snake(class_basename($this)), $this->id), 'public'),
            'disk' => 'public',
        ]);

        $this->unsetRelation('avatar');
    }
}
