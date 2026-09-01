<?php

namespace App\Models;

use Database\Factories\ContactInboxFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/models/contact_inbox.rb.
// Bỏ ở B2: conversations (B3), validate source_id theo kênh Twilio/Whatsapp
// (đi cùng driver kênh đó), webhook_data.
class ContactInbox extends Model
{
    /** @use HasFactory<ContactInboxFactory> */
    use HasFactory;

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
}
