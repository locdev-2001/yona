<?php

namespace App\Models\Concerns;

use App\Models\Attachment;
use App\Support\AvatarContentType;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

// Tương đương concern Avatarable của Chatwoot: mọi model có avatar
// (User, Inbox…) dùng chung một chỗ gắn/thay/đọc URL.
trait Avatarable
{
    public const ALLOWED_AVATAR_CONTENT_TYPES = AvatarContentType::ALLOWED;

    public function avatar(): MorphOne
    {
        return $this->morphOne(Attachment::class, 'attachable');
    }

    public function avatarUrl(): string
    {
        return $this->avatar?->url() ?? '';
    }

    public function removeAvatar(): void
    {
        if ($this->avatar === null) {
            return;
        }

        $this->avatar->delete();
        $this->saveOwnerAfterAvatarChange();
    }

    public function replaceAvatar(UploadedFile $file): void
    {
        $this->storeAvatarAttachment(
            path: $file->store($this->avatarDirectory(), 'public'),
            extension: $file->extension(),
            filename: $file->getClientOriginalName(),
            contentType: (string) $file->getMimeType(),
            byteSize: (int) $file->getSize(),
        );
    }

    // Cho avatar tải về từ URL (AvatarFromUrlJob) — không có UploadedFile.
    public function replaceAvatarFromContents(string $contents, string $filename, string $contentType): void
    {
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $storedName = Str::random(40).($extension !== '' ? ".{$extension}" : '');
        $path = $this->avatarDirectory().'/'.$storedName;

        Storage::disk('public')->put($path, $contents);

        $this->storeAvatarAttachment(
            path: $path,
            extension: $extension,
            filename: $filename,
            contentType: $contentType,
            byteSize: strlen($contents),
        );
    }

    private function avatarDirectory(): string
    {
        return sprintf('avatars/%s/%d', Str::snake(class_basename($this)), $this->id);
    }

    private function storeAvatarAttachment(
        string $path,
        string $extension,
        string $filename,
        string $contentType,
        int $byteSize,
    ): void {
        $this->avatar?->delete();

        $this->avatar()->create([
            'account_id' => $this->account_id ?? null,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'extension' => $extension,
            'filename' => $filename,
            'content_type' => $contentType,
            'byte_size' => $byteSize,
            'path' => $path,
            'disk' => 'public',
        ]);

        $this->saveOwnerAfterAvatarChange();
    }

    // Gắn và xoá ảnh cùng lưu lại record chủ để hook cập nhật chạy và người
    // đang xem nhận ảnh mới hoặc ảnh rỗng (Contact phát contact.updated).
    // Eloquent bỏ qua hook khi không cột nào đổi nên phải chạm updated_at; còn
    // thay đổi chờ ghi thì lần save của nơi gọi sẽ chạy hook.
    private function saveOwnerAfterAvatarChange(): void
    {
        $this->unsetRelation('avatar');

        if (! $this->isDirty()) {
            $this->touch();
        }
    }
}
