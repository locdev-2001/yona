<?php

namespace App\Models;

use Database\Factories\PaymentAccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

/** Tài khoản ngân hàng nhận chuyển khoản (VietQR) của một tenant. */
class PaymentAccount extends Model
{
    /** @use HasFactory<PaymentAccountFactory> */
    use HasFactory;

    protected $fillable = [
        'account_id',
        'bank_bin',
        'bank_code',
        'account_number',
        'account_name',
        'memo_template',
        'is_default',
        'allow_all_agents',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'allow_all_agents' => 'boolean',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    // Chỉ một tài khoản mặc định mỗi account: đặt cái này làm mặc định thì bỏ
    // mặc định các tài khoản còn lại trong cùng transaction.
    public function markAsDefault(): void
    {
        DB::transaction(function () {
            self::query()
                ->where('account_id', $this->account_id)
                ->whereKeyNot($this->id)
                ->update(['is_default' => false]);

            $this->forceFill(['is_default' => true])->save();
        });
    }
}
