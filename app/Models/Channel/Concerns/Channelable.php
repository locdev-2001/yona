<?php

namespace App\Models\Channel\Concerns;

use App\Models\Account;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Support\Facades\Schema;
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
     * ActiveRecord giữ nguyên chuỗi rỗng client gửi lên; middleware
     * `ConvertEmptyStringsToNull` của Laravel đổi '' thành null trước khi tới
     * model, làm vỡ mọi cột chuỗi NOT NULL (imap_address, smtp_login,
     * allowed_domains…). Trả null về '' đúng những cột đó để hành vi khớp bản gốc.
     */
    public function setAttribute($key, $value)
    {
        if ($value === null && in_array($key, static::blankableStringColumns(), true)) {
            $value = '';
        }

        return parent::setAttribute($key, $value);
    }

    /**
     * Cột chuỗi NOT NULL có giá trị mặc định — danh sách đọc thẳng từ schema nên
     * thêm cột mới cho một kênh không phải khai lại ở đây.
     *
     * @return list<string>
     */
    protected static function blankableStringColumns(): array
    {
        static $columnsByModel = [];

        return $columnsByModel[static::class] ??= collect(Schema::getColumns((new static)->getTable()))
            ->filter(fn (array $column) => ! $column['nullable']
                && $column['default'] !== null
                && in_array($column['type_name'], ['varchar', 'text', 'bpchar', 'char'], true))
            ->pluck('name')
            ->all();
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

    /**
     * Kênh tự quyết tên inbox (Api::V1::InboxesHelper#inbox_name) — Telegram lấy
     * username của bot. Kênh nào trả true thì form tạo không cần ô tên.
     */
    public static function namesInboxItself(): bool
    {
        return false;
    }
}
