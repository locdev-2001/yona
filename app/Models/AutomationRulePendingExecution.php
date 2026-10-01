<?php

namespace App\Models;

use App\Models\Concerns\ReferencesPartitionedMessage;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

// Bản dịch pending execution. Một unique episode tránh duplicate
// khi listener nhận cùng event hai lần; processing/executing tách để crash không
// gửi lại message khách hàng đã nhận.
class AutomationRulePendingExecution extends Model
{
    use ReferencesPartitionedMessage;

    public const STATUS_PENDING = 0;

    public const STATUS_PROCESSING = 1;

    public const STATUS_EXECUTED = 2;

    public const STATUS_SKIPPED = 3;

    public const STATUS_EXECUTING = 4;

    public const DUE_WINDOW_DAYS = 3;

    public const STALE_PROCESSING_MINUTES = 15;

    public const RETENTION_WINDOW_DAYS = 30;

    protected $fillable = [
        'account_id', 'automation_rule_id', 'conversation_id', 'message_id', 'message_created_at',
        'due_at', 'episode_key', 'skip_reason', 'status',
    ];

    protected function casts(): array
    {
        return ['due_at' => 'datetime', 'status' => 'integer'];
    }

    public function automationRule(): BelongsTo
    {
        return $this->belongsTo(AutomationRule::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /** @return Builder<static> */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /** @return Builder<static> */
    public function scopeProcessing(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PROCESSING);
    }

    /** @return Builder<static> */
    public function scopeStaleProcessing(Builder $query): Builder
    {
        return $query->processing()->where('updated_at', '<', now()->subMinutes(self::STALE_PROCESSING_MINUTES));
    }

    /** @return Builder<static> */
    public function scopeSweepable(Builder $query): Builder
    {
        return $query->where(function (Builder $inner) {
            $inner->where(fn (Builder $pending) => $pending->where('status', self::STATUS_PENDING)->where('due_at', '<=', now()))
                ->orWhere(fn (Builder $stale) => $stale->where('status', self::STATUS_PROCESSING)
                    ->where('updated_at', '<', now()->subMinutes(self::STALE_PROCESSING_MINUTES)));
        });
    }

    /** @return Builder<static> */
    public function scopeArmed(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_PROCESSING]);
    }

    /** @return Builder<static> */
    public function scopeAbandoned(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_EXECUTING)
            ->where('updated_at', '<', now()->subMinutes(self::STALE_PROCESSING_MINUTES));
    }

    public static function schedule(AutomationRule $rule, Conversation $conversation, ?Message $message = null): ?self
    {
        if ($message === null && $conversation->status_changed_at === null) {
            return null;
        }

        $episodeKey = self::armEpisodeKeyFor($conversation, $message);
        $anchor = self::armAnchorFor($conversation, $message);

        try {
            return self::query()->create([
                'automation_rule_id' => $rule->id,
                'account_id' => $conversation->account_id,
                'conversation_id' => $conversation->id,
                'message_id' => $message?->id,
                'message_created_at' => $message === null ? null : self::messageCreatedAtOf($message),
                'episode_key' => $episodeKey,
                'due_at' => $anchor->copy()->addMinutes((int) $rule->execution_delay),
                'status' => self::STATUS_PENDING,
            ]);
        } catch (UniqueConstraintViolationException) {
            return self::rearmOrAdvanceEpisode($rule, $conversation, $episodeKey, $message, $anchor);
        }
    }

    public static function rearmOrAdvanceEpisode(
        AutomationRule $rule,
        Conversation $conversation,
        string $episodeKey,
        ?Message $message,
        CarbonInterface $anchor,
    ): ?self {
        if ($message === null) {
            return null;
        }

        $row = self::query()->where('automation_rule_id', $rule->id)
            ->where('conversation_id', $conversation->id)
            ->where('episode_key', $episodeKey)
            ->first();

        if ($row === null) {
            return null;
        }

        DB::transaction(function () use ($row, $message, $rule, $anchor) {
            $row = self::query()->whereKey($row->id)->lockForUpdate()->first();
            if ($row === null) {
                return;
            }
            if ($row->message_id !== null && $message->id <= $row->message_id) {
                return;
            }
            if (! in_array($row->status, [self::STATUS_PENDING, self::STATUS_SKIPPED], true)
                && ! $row->staleProcessing()) {
                return;
            }

            $row->update([
                'status' => self::STATUS_PENDING,
                'skip_reason' => null,
                'due_at' => $anchor->copy()->addMinutes((int) $rule->execution_delay),
                'message_id' => $message->id,
                'message_created_at' => self::messageCreatedAtOf($message),
            ]);
        });

        return $row->refresh();
    }

    public static function purgeTerminal(): int
    {
        return self::query()->whereIn('status', [self::STATUS_EXECUTED, self::STATUS_SKIPPED])
            ->where('updated_at', '<', now()->subDays(self::RETENTION_WINDOW_DAYS))->delete();
    }

    public function claim(): bool
    {
        return DB::transaction(function (): bool {
            $row = self::query()->whereKey($this->id)->lockForUpdate()->first();
            if ($row === null) {
                return false;
            }
            if (! (($row->status === self::STATUS_PENDING && $row->due_at <= now()) || $row->staleProcessing())) {
                return false;
            }

            $row->update(['status' => self::STATUS_PROCESSING, 'updated_at' => now()]);

            return true;
        });
    }

    public function staleProcessing(): bool
    {
        return $this->status === self::STATUS_PROCESSING
            && $this->updated_at->lt(now()->subMinutes(self::STALE_PROCESSING_MINUTES));
    }

    public function episodeCurrent(): bool
    {
        return self::episodeKeyFor($this->conversation, $this->message) === $this->episode_key;
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_EXECUTED, self::STATUS_SKIPPED], true);
    }

    private static function armAnchorFor(Conversation $conversation, ?Message $message): CarbonInterface
    {
        if ($message === null) {
            return $conversation->status_changed_at ?? now();
        }

        return $message->isIncoming()
            ? ($conversation->waiting_since ?? $message->created_at)
            : $message->created_at;
    }

    private static function armEpisodeKeyFor(Conversation $conversation, ?Message $message): string
    {
        if ($message === null) {
            return 'status:'.self::stamp($conversation->status_changed_at);
        }

        if ($message->isIncoming() && $conversation->waiting_since === null) {
            return 'awaiting_agent:'.self::stamp($message->created_at);
        }

        return self::episodeKeyFor($conversation, $message);
    }

    private static function episodeKeyFor(Conversation $conversation, ?Message $message): string
    {
        if ($message === null) {
            return 'status:'.self::stamp($conversation->status_changed_at);
        }

        if ($message->isIncoming()) {
            return 'awaiting_agent:'.self::stamp($conversation->waiting_since);
        }

        return 'reply_chase:'.($conversation->messages()->incoming()->where('id', '<', $message->id)->max('id') ?? 0);
    }

    private static function stamp(?CarbonInterface $time): string
    {
        return $time?->format('Uu') ?? '0';
    }
}
