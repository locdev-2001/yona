<?php

namespace App\Models;

use App\Models\Concerns\Avatarable;
use App\Models\Concerns\WebhookSecretable;
use Database\Factories\AgentBotFactory;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Foundation\Auth\Access\Authorizable;

// Port từ refs/chatwoot/app/models/agent_bot.rb. Implement Authenticatable vì
// bot đăng nhập Application API bằng access_token như một "người dùng" (Chatwoot
// gán Current.user = AgentBot).
class AgentBot extends Model implements Authenticatable
{
    /** @use HasFactory<AgentBotFactory> */
    use Authorizable, Avatarable, HasFactory, \Illuminate\Auth\Authenticatable, WebhookSecretable;

    public const TYPE_WEBHOOK = 0;

    public const BOT_TYPES = ['webhook' => self::TYPE_WEBHOOK];

    /** Limits::URL_LENGTH_LIMIT */
    public const URL_LENGTH_LIMIT = 2000;

    protected $fillable = [
        'account_id',
        'name',
        'description',
        'outgoing_url',
        'bot_type',
        'bot_config',
    ];

    protected $attributes = ['bot_type' => self::TYPE_WEBHOOK];

    protected function casts(): array
    {
        return [
            'bot_config' => 'array',
            'bot_type' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // AccessTokenable: bot có token Application API ngay khi tạo.
        static::created(function (AgentBot $agentBot) {
            $agentBot->accessToken()->create([]);
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function accessToken(): MorphOne
    {
        return $this->morphOne(AccessToken::class, 'owner');
    }

    public function agentBotInboxes(): HasMany
    {
        return $this->hasMany(AgentBotInbox::class);
    }

    public function messages(): MorphMany
    {
        return $this->morphMany(Message::class, 'sender');
    }

    public function assignedConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'assignee_agent_bot_id');
    }

    // scope :accessible_to — bot của account + system bot (account_id NULL).
    public function scopeAccessibleTo(Builder $query, ?Account $account): Builder
    {
        return $query->where(fn (Builder $inner) => $inner
            ->whereNull('account_id')
            ->when($account !== null, fn (Builder $q) => $q->orWhere('account_id', $account->id)));
    }

    public function isSystemBot(): bool
    {
        return $this->account_id === null;
    }

    public function availableName(): string
    {
        return (string) $this->name;
    }

    public function botTypeName(): string
    {
        return array_flip(self::BOT_TYPES)[$this->bot_type] ?? 'webhook';
    }

    public function pushEventData(?Inbox $inbox = null): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'avatar_url' => $this->avatarUrl() ?: $inbox?->avatarUrl(),
            'type' => 'agent_bot',
        ];
    }

    public function webhookData(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => 'agent_bot',
        ];
    }
}
