<?php

namespace App\Models;

use App\Exceptions\RecordInvalidException;
use App\Models\Concerns\ReferencesPartitionedMessage;
use Database\Factories\CsatSurveyResponseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Bỏ nhánh review notes (chỉ mã enterprise ghi) — xem migration; bộ scope
// `filter_by_*` chỉ phục vụ báo cáo CSAT nên port cùng D2.
class CsatSurveyResponse extends Model
{
    /** @use HasFactory<CsatSurveyResponseFactory> */
    use HasFactory, ReferencesPartitionedMessage;

    public const RATINGS = [1, 2, 3, 4, 5];

    protected $fillable = [
        'account_id',
        'conversation_id',
        'message_id',
        'message_created_at',
        'contact_id',
        'assigned_agent_id',
        'rating',
        'feedback_message',
    ];

    protected function casts(): array
    {
        return ['rating' => 'integer'];
    }

    protected static function booted(): void
    {
        static::saving(function (CsatSurveyResponse $response) {
            $response->validate();
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function assignedAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_agent_id');
    }

    // validates presence + inclusion 1..5 của bản gốc; Eloquent không có tầng
    // validation nên chặn ngay trước khi ghi để không sinh phiếu rác.
    private function validate(): void
    {
        foreach (['account_id', 'contact_id', 'conversation_id'] as $attribute) {
            if (blank($this->getAttribute($attribute))) {
                throw new RecordInvalidException(str_replace('_', ' ', ucfirst($attribute)).' can\'t be blank');
            }
        }

        if (! in_array($this->rating, self::RATINGS, true)) {
            throw new RecordInvalidException('Rating is not included in the list');
        }
    }
}
