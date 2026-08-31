<?php

namespace App\Models;

use Database\Factories\AccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Account extends Model
{
    /** @use HasFactory<AccountFactory> */
    use HasFactory;

    public const STATUS_ACTIVE = 0;

    public const STATUS_SUSPENDED = 1;

    public const ONBOARDING_STEP_KEY = 'onboarding_step';

    protected $fillable = [
        'name',
        'locale',
        'domain',
        'support_email',
        'auto_resolve_duration',
        'custom_attributes',
        'settings',
        'status',
    ];

    protected $attributes = [
        'locale' => 'en',
        'status' => self::STATUS_ACTIVE,
    ];

    protected function casts(): array
    {
        return [
            'feature_flags' => 'array',
            'limits' => 'array',
            'custom_attributes' => 'array',
            'internal_attributes' => 'array',
            'settings' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::deleted(function (Account $account) {
            DB::statement("DROP SEQUENCE IF EXISTS camp_dpid_seq_{$account->id}");
            DB::statement("DROP SEQUENCE IF EXISTS conv_dpid_seq_{$account->id}");
        });
    }

    public function accountUsers(): HasMany
    {
        return $this->hasMany(AccountUser::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'account_users')
            ->withPivot(['role', 'availability', 'auto_offline', 'active_at'])
            ->withTimestamps();
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    public function onboardingStep(): ?string
    {
        return $this->custom_attributes[self::ONBOARDING_STEP_KEY] ?? null;
    }

    public function finishOnboarding(): void
    {
        $customAttributes = $this->custom_attributes;
        unset($customAttributes[self::ONBOARDING_STEP_KEY]);
        $this->custom_attributes = $customAttributes;
        $this->save();
    }
}
