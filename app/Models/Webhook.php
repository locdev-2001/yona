<?php

namespace App\Models;

use App\Models\Concerns\WebhookSecretable;
use Database\Factories\WebhookFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Webhook extends Model
{
    /** @use HasFactory<WebhookFactory> */
    use HasFactory, WebhookSecretable;

    public const TYPE_ACCOUNT = 0;

    public const TYPE_INBOX = 1;

    /** ALLOWED_WEBHOOK_EVENTS — cũng là danh sách sự kiện màn Webhooks cho chọn. */
    public const ALLOWED_EVENTS = [
        'conversation_status_changed',
        'conversation_updated',
        'conversation_created',
        'contact_created',
        'contact_updated',
        'message_created',
        'message_updated',
        'webwidget_triggered',
        'inbox_created',
        'inbox_updated',
        'conversation_typing_on',
        'conversation_typing_off',
    ];

    protected $fillable = [
        'account_id',
        'inbox_id',
        'name',
        'url',
        'subscriptions',
        'webhook_type',
    ];

    protected $attributes = ['webhook_type' => self::TYPE_ACCOUNT];

    protected function casts(): array
    {
        return [
            'subscriptions' => 'array',
            'webhook_type' => 'integer',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    public function scopeAccountType(Builder $query): Builder
    {
        return $query->where('webhook_type', self::TYPE_ACCOUNT);
    }

    public function isSubscribedTo(string $event): bool
    {
        return in_array($event, $this->subscriptions ?? [], true);
    }
}
