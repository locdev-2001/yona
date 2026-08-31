<?php

namespace App\Models;

use App\Notifications\ConfirmationInstructions;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const AVAILABILITY_ONLINE = 0;

    public const AVAILABILITY_OFFLINE = 1;

    public const AVAILABILITY_BUSY = 2;

    protected $attributes = [
        'provider' => 'email',
        'availability' => self::AVAILABILITY_ONLINE,
    ];

    protected $fillable = [
        'name',
        'display_name',
        'email',
        'password',
        'provider',
        'uid',
        'availability',
        'ui_settings',
        'custom_attributes',
        'message_signature',
        'confirmed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'otp_secret',
        'otp_backup_codes',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'ui_settings' => 'array',
            'custom_attributes' => 'array',
            'confirmed_at' => 'datetime',
            'confirmation_sent_at' => 'datetime',
            'current_sign_in_at' => 'datetime',
            'last_sign_in_at' => 'datetime',
            'otp_required_for_login' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            $user->email = mb_strtolower($user->email ?? '');
        });

        static::creating(function (User $user) {
            $user->uid = $user->uid ?: $user->email;
            $user->pubsub_token ??= Str::random(24);
        });

        static::updating(function (User $user) {
            if ($user->isDirty('password')) {
                $user->pubsub_token = Str::random(24);
            }
        });
    }

    /** @return list<string> Rule mật khẩu chung cho signup + đổi mật khẩu (độ phức tạp như Chatwoot). */
    public static function passwordRules(): array
    {
        return [
            'required', 'string', 'min:6',
            'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/',
            'regex:/[!@#$%^&*()_+\-=\[\]{}|\'"\/\\\\.,`<>:;?~]/',
        ];
    }

    public function accounts(): BelongsToMany
    {
        return $this->belongsToMany(Account::class, 'account_users')
            ->withPivot(['role', 'availability', 'auto_offline', 'active_at'])
            ->withTimestamps();
    }

    public function accountUsers(): HasMany
    {
        return $this->hasMany(AccountUser::class);
    }

    public function avatar(): MorphOne
    {
        return $this->morphOne(Attachment::class, 'attachable');
    }

    // Tương đương Avatarable#avatar_url (Chatwoot trả '' khi chưa có avatar).
    public function avatarUrl(): string
    {
        return $this->avatar?->url() ?? '';
    }

    // Devise reconfirmable gửi mail xác nhận tới địa chỉ MỚI (unconfirmed_email).
    public function routeNotificationForMail(Notification $notification): string
    {
        if ($notification instanceof ConfirmationInstructions && $this->unconfirmed_email) {
            return $this->unconfirmed_email;
        }

        return $this->email;
    }

    public function isConfirmed(): bool
    {
        return $this->confirmed_at !== null;
    }

    public function availableName(): string
    {
        return $this->display_name ?: $this->name;
    }
}
