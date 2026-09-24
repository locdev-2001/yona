<?php

namespace App\Search;

use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

// Loại bản ghi một lượt tìm trả về — cũng là loại tài liệu trong chỉ mục và outbox.
enum SearchTarget: string
{
    case Conversations = 'conversations';
    case Messages = 'messages';
    case Contacts = 'contacts';
    case Files = 'files';

    // Tin và tệp: phạm vi (hộp thư, hội thoại, người gửi, mốc nhìn lại) đi theo tin.
    public function isMessageBound(): bool
    {
        return $this === self::Messages || $this === self::Files;
    }

    /** @return class-string<Model> */
    public function modelClass(): string
    {
        return match ($this) {
            self::Conversations => Conversation::class,
            self::Messages => Message::class,
            self::Contacts => Contact::class,
            self::Files => Attachment::class,
        };
    }

    public static function forModel(Model $model): self
    {
        foreach (self::cases() as $target) {
            if ($model instanceof ($target->modelClass())) {
                return $target;
            }
        }

        throw new \InvalidArgumentException('Model '.$model::class.' không phải tài liệu tìm kiếm.');
    }

    // Toàn bộ bản ghi là tài liệu của loại này, lọc theo account khi có.
    /** @return Builder<Model> */
    public function documents(?int $accountId = null): Builder
    {
        $model = new ($this->modelClass());

        return $model->newQuery()
            ->searchDocuments()
            ->when($accountId !== null, fn (Builder $query) => $query->where($model->qualifyColumn('account_id'), $accountId));
    }
}
