<?php

namespace App\Support;

use App\Models\Account;
use App\Models\Attachment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Tương đương `has_one_attached :<tên>` của ActiveStorage: một bản ghi giữ
 * nhiều tệp phân biệt bằng vai trò (import_file, failed_records,
 * contacts_export). Đây là chỗ DUY NHẤT biết cách lưu/thay/đọc tệp theo vai trò.
 */
final class RoleAttachment
{
    public static function for(Model $owner, string $role): ?Attachment
    {
        return self::relation($owner)->where('role', $role)->latest('id')->first();
    }

    public static function attachUpload(Model $owner, string $role, UploadedFile $file): Attachment
    {
        $path = $file->store(self::directory($owner, $role), 'public');

        return self::persist($owner, $role, [
            'path' => $path,
            'filename' => $file->getClientOriginalName(),
            'content_type' => $file->getClientMimeType() ?: $file->getMimeType(),
            'byte_size' => (int) $file->getSize(),
        ]);
    }

    public static function attachContents(
        Model $owner,
        string $role,
        string $contents,
        string $filename,
        string $contentType,
    ): Attachment {
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $path = self::directory($owner, $role).'/'.Str::random(40).($extension !== '' ? ".{$extension}" : '');

        Storage::disk('public')->put($path, $contents);

        return self::persist($owner, $role, [
            'path' => $path,
            'filename' => $filename,
            'content_type' => $contentType,
            'byte_size' => strlen($contents),
        ]);
    }

    public static function contents(Model $owner, string $role): ?string
    {
        $attachment = self::for($owner, $role);

        if ($attachment?->path === null) {
            return null;
        }

        $contents = Storage::disk($attachment->disk)->get($attachment->path);

        return is_string($contents) ? $contents : null;
    }

    /** @param array<string, mixed> $attributes */
    private static function persist(Model $owner, string $role, array $attributes): Attachment
    {
        self::for($owner, $role)?->delete();

        return self::relation($owner)->create([
            ...$attributes,
            'account_id' => $owner instanceof Account ? $owner->getKey() : $owner->getAttribute('account_id'),
            'file_type' => Attachment::fileTypeFor($attributes['content_type'] ?? null),
            'disk' => 'public',
            'role' => $role,
        ]);
    }

    /** @return MorphMany<Attachment, Model> */
    private static function relation(Model $owner): MorphMany
    {
        return $owner->morphMany(Attachment::class, 'attachable');
    }

    private static function directory(Model $owner, string $role): string
    {
        return sprintf('%s/%d/%s', Str::snake(Str::plural(class_basename($owner))), $owner->getKey(), $role);
    }
}
