<?php

namespace App\Models;

use App\Models\Concerns\AccessTokenable;
use App\Models\Concerns\Avatarable;
use App\Models\Concerns\Reportable;
use App\Models\Concerns\SsoAuthenticatable;
use App\Notifications\ConfirmationInstructions;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use AccessTokenable, Avatarable, HasFactory, Notifiable, Reportable, SsoAuthenticatable;

    public const AVAILABILITY_ONLINE = 0;

    public const AVAILABILITY_OFFLINE = 1;

    public const AVAILABILITY_BUSY = 2;

    // Cửa sổ chấp nhận lệch đồng hồ khi kiểm mã TOTP. devise-two-factor cho phép
    // 30 giây trước/sau; otphp bắt buộc leeway < chu kỳ 30s nên lấy 29.
    public const OTP_LEEWAY_SECONDS = 29;

    private const RANDOM_PASSWORD_LENGTH = 32;

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
        'reset_password_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'ui_settings' => 'array',
            'custom_attributes' => 'array',
            'confirmed_at' => 'datetime',
            'confirmation_sent_at' => 'datetime',
            'reset_password_sent_at' => 'datetime',
            'current_sign_in_at' => 'datetime',
            'last_sign_in_at' => 'datetime',
            'otp_required_for_login' => 'boolean',
            // Chatwoot mã hoá hai cột này ở tầng ứng dụng (ActiveRecord encrypts);
            // ở đây dùng cast encrypted của Laravel (khoá APP_KEY).
            'otp_secret' => 'encrypted',
            'otp_backup_codes' => 'encrypted:array',
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

        // remove_macros: macro riêng chết theo tác giả, macro global ở lại
        // account với created_by rỗng.
        static::deleting(function (User $user) {
            Macro::query()->where('created_by_id', $user->id)->personal()->delete();
        });
    }

    public function userSessions(): HasMany
    {
        return $this->hasMany(UserSession::class);
    }

    // devise `send_confirmation_instructions` — dùng chung cho đăng ký và cho
    // nút gửi lại ở console quản trị.
    public function sendConfirmationInstructions(): void
    {
        $this->forceFill([
            'confirmation_token' => $this->confirmation_token ?? Str::random(40),
            'confirmation_sent_at' => now(),
        ])->save();

        $this->notify(new ConfirmationInstructions);
    }

    public function mfaEnabled(): bool
    {
        return (bool) $this->otp_required_for_login;
    }

    // Tương đương User.from_email của Chatwoot (email đã chuẩn hóa lowercase khi lưu).
    public static function fromEmail(?string $email): ?self
    {
        if ($email === null || $email === '') {
            return null;
        }

        return self::query()->where('email', mb_strtolower($email))->first();
    }

    // Tương đương Devise set_reset_password_token — sinh token cho link đặt mật khẩu.
    public function generateResetPasswordToken(): string
    {
        $token = Str::random(40);
        $this->forceFill([
            'reset_password_token' => $token,
            'reset_password_sent_at' => now(),
        ])->save();

        return $token;
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

    // Mật khẩu ngẫu nhiên cho tài khoản không đặt mật khẩu (đăng nhập bằng nhà
    // cung cấp OAuth); chủ tài khoản muốn dùng mật khẩu thì qua "Quên mật khẩu".
    public static function randomPassword(): string
    {
        return Str::password(self::RANDOM_PASSWORD_LENGTH);
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

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_members')->withTimestamps();
    }

    public function inboxes(): BelongsToMany
    {
        return $this->belongsToMany(Inbox::class, 'inbox_members')->withTimestamps();
    }

    public function conversationParticipants(): HasMany
    {
        return $this->hasMany(ConversationParticipant::class);
    }

    public function participatingConversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, 'conversation_participants')->withTimestamps();
    }

    public function mentions(): HasMany
    {
        return $this->hasMany(Mention::class);
    }

    // Ghi đè quan hệ notifications() của trait Notifiable (kênh database không
    // dùng ở đây) — `use Illuminate\Notifications\Notification` ở đầu file nên
    // phải chỉ đích danh model của repo.
    public function notifications(): HasMany
    {
        return $this->hasMany(\App\Models\Notification::class);
    }

    public function notificationSettings(): HasMany
    {
        return $this->hasMany(NotificationSetting::class);
    }

    public function notificationSubscriptions(): HasMany
    {
        return $this->hasMany(NotificationSubscription::class);
    }

    // User#assigned_inboxes: admin thấy mọi inbox của account, agent chỉ inbox mình là member.
    /** @return Builder<Inbox> */
    public function assignedInboxes(Account $account, AccountUser $accountUser): Builder
    {
        if ($accountUser->isAdministrator()) {
            return $account->inboxes()->getQuery();
        }

        return Inbox::query()
            ->where('account_id', $account->id)
            ->whereIn('id', $this->inboxes()->select('inboxes.id'));
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
