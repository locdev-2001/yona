<?php

namespace App\Models;

use Database\Factories\AgentBotInboxFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/agent_bot_inbox.rb.
class AgentBotInbox extends Model
{
    /** @use HasFactory<AgentBotInboxFactory> */
    use HasFactory;

    public const STATUS_ACTIVE = 0;

    public const STATUS_INACTIVE = 1;

    protected $fillable = ['account_id', 'agent_bot_id', 'inbox_id', 'status'];

    protected $attributes = ['status' => self::STATUS_ACTIVE];

    protected function casts(): array
    {
        return ['status' => 'integer'];
    }

    protected static function booted(): void
    {
        // before_validation :ensure_account_id — account luôn lấy từ inbox.
        static::saving(function (AgentBotInbox $agentBotInbox) {
            $agentBotInbox->account_id = $agentBotInbox->inbox?->account_id;
        });
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    public function agentBot(): BelongsTo
    {
        return $this->belongsTo(AgentBot::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
