<?php

namespace App\Models;

use App\Support\FlagBitmask;
use Database\Factories\NotificationSettingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Hai cột bitmask
// (email_flags / push_flags) sinh từ chính Notification::TYPES, đúng cách
// EMAIL_NOTIFICATION_FLAGS/PUSH_NOTIFICATION_FLAGS của bản gốc.
class NotificationSetting extends Model
{
    /** @use HasFactory<NotificationSettingFactory> */
    use HasFactory;

    public const DELIVERY_TYPES = ['email', 'push'];

    protected $fillable = [
        'account_id',
        'user_id',
        'email_flags',
        'push_flags',
    ];

    private static function bitmask(string $deliveryType): FlagBitmask
    {
        $flags = [];
        foreach (Notification::TYPES as $type => $position) {
            $flags[$position] = "{$deliveryType}_{$type}";
        }

        return new FlagBitmask($flags);
    }

    /** @return list<string> */
    public static function allFlags(string $deliveryType): array
    {
        return array_map(
            fn (string $type) => "{$deliveryType}_{$type}",
            array_keys(Notification::TYPES),
        );
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return list<string> */
    public function selectedFlags(string $deliveryType): array
    {
        return self::bitmask($deliveryType)->toNames((int) $this->{"{$deliveryType}_flags"});
    }

    /** @param iterable<mixed>|null $names */
    public function setSelectedFlags(string $deliveryType, ?iterable $names): void
    {
        $this->{"{$deliveryType}_flags"} = self::bitmask($deliveryType)->toBitmask($names);
    }

    // email_conversation_assignment? / push_conversation_mention? …
    public function hasFlag(string $deliveryType, string $notificationType): bool
    {
        return in_array("{$deliveryType}_{$notificationType}", $this->selectedFlags($deliveryType), true);
    }
}
