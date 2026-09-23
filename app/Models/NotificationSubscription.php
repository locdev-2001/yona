<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/notification_subscription.rb — một trình duyệt
// (hoặc thiết bị) đã đăng ký nhận thông báo đẩy của một user. Yona không có app
// di động nên chỉ giữ loại browser_push; mã số giữ đúng bản gốc.
class NotificationSubscription extends Model
{
    public const TYPE_BROWSER_PUSH = 1;

    public const SUBSCRIPTION_TYPES = ['browser_push' => self::TYPE_BROWSER_PUSH];

    protected $fillable = [
        'user_id',
        'subscription_type',
        'subscription_attributes',
        'identifier',
    ];

    protected function casts(): array
    {
        return [
            'subscription_type' => 'integer',
            'subscription_attributes' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isBrowserPush(): bool
    {
        return $this->subscription_type === self::TYPE_BROWSER_PUSH;
    }

    public function subscriptionTypeName(): string
    {
        return array_flip(self::SUBSCRIPTION_TYPES)[$this->subscription_type] ?? '';
    }

    public function subscriptionAttribute(string $name): ?string
    {
        $value = $this->subscription_attributes[$name] ?? null;

        return is_string($value) ? $value : null;
    }

    // NotificationSubscriptionBuilder: định danh là endpoint của trình duyệt. Cùng
    // trình duyệt đăng nhập tài khoản khác thì bản ghi chuyển sang user mới thay vì
    // nhân đôi — push service chỉ giữ một đăng ký cho mỗi endpoint.
    /** @param array{endpoint: string, p256dh: string, auth: string} $attributes */
    public static function registerBrowserPush(User $user, array $attributes): self
    {
        return self::query()->updateOrCreate(
            ['identifier' => $attributes['endpoint']],
            [
                'user_id' => $user->id,
                'subscription_type' => self::TYPE_BROWSER_PUSH,
                'subscription_attributes' => $attributes,
            ],
        );
    }
}
