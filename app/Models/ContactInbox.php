<?php

namespace App\Models;

use App\Http\Resources\ContactResource;
use App\Http\Resources\ConversationResource;
use Database\Factories\ContactInboxFactory;
use Illuminate\Auth\Authenticatable as AuthenticatableTrait;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

// Bỏ ở B2: conversations (B3), validate source_id theo kênh Twilio/Whatsapp
// (đi cùng driver kênh đó), webhook_data.
//
// Authenticatable: RoomChannel#current_user coi CHÍNH pubsub_token
// là bằng chứng để khách nghe kênh realtime. Guard `widget` (config/auth.php)
// tra token đó qua model này, nên nó phải là một "principal" hợp lệ với
// broadcasting của Laravel — không dùng cho đăng nhập HTTP.
class ContactInbox extends Model implements Authenticatable
{
    /** @use HasFactory<ContactInboxFactory> */
    use AuthenticatableTrait, HasFactory;

    protected $fillable = [
        'contact_id',
        'inbox_id',
        'source_id',
        'hmac_verified',
        'pubsub_token',
    ];

    protected function casts(): array
    {
        return [
            'hmac_verified' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Pubsubable: has_secure_token :pubsub_token — token realtime, dùng từ B4.
        static::creating(function (ContactInbox $contactInbox) {
            $contactInbox->pubsub_token ??= Str::random(24);
        });
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    // ContactInbox#webhook_data — payload của sự kiện webwidget_triggered.
    public function webhookData(): array
    {
        $conversation = $this->conversations()->orderBy('id')->get()->last();

        return [
            'id' => $this->id,
            'contact' => $this->contact === null ? null : ContactResource::webhookData($this->contact),
            'inbox' => $this->inbox->webhookData(),
            'account' => $this->inbox->account->webhookData(),
            'current_conversation' => $conversation === null
                ? null
                : ConversationResource::webhookData($conversation),
            'source_id' => $this->source_id,
        ];
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }
}
