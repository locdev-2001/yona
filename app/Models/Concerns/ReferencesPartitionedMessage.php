<?php

namespace App\Models\Concerns;

use App\Models\Message;
use Illuminate\Database\Eloquent\Model;

/**
 * messages chia partition nên khoá ngoại tới tin là (message_id, message_created_at).
 * Nơi ghi đã biết tin thì truyền thẳng; còn lại điền từ DB lúc lưu. Giá trị lấy
 * nguyên chuỗi gốc (không qua cast) để giữ đủ micro giây, lệch là vỡ khoá ngoại.
 */
trait ReferencesPartitionedMessage
{
    public static function messageCreatedAtOf(Message $message): ?string
    {
        return $message->getRawOriginal('created_at');
    }

    protected static function bootReferencesPartitionedMessage(): void
    {
        static::saving(function (Model $model) {
            if ($model->message_id === null) {
                $model->message_created_at = null;

                return;
            }

            $stale = $model->isDirty('message_id') && ! $model->isDirty('message_created_at');

            if ($model->message_created_at === null || $stale) {
                $model->message_created_at = Message::query()->whereKey($model->message_id)->toBase()->value('created_at');
            }
        });
    }
}
