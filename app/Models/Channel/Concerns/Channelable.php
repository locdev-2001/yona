<?php

namespace App\Models\Channel\Concerns;

use App\Models\Account;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/models/concerns/channelable.rb — phần chung của mọi
// kênh: thuộc account, có đúng một inbox, và sinh token kiểu has_secure_token
// (base58 24 ký tự). Thêm kênh mới = dùng trait này, không chép lại.
trait Channelable
{
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function inbox(): MorphOne
    {
        return $this->morphOne(Inbox::class, 'channel');
    }

    public static function generateToken(): string
    {
        return Str::random(24);
    }

    /**
     * Quy tắc validate cho khối `channel[...]` lúc tạo inbox. Mỗi kênh tự khai,
     * lõi (InboxesController) chỉ ghép tiền tố — không biết kênh nào có cột gì.
     *
     * @return array<string, list<string>>
     */
    public static function channelRules(): array
    {
        return [];
    }
}
