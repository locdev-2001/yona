<?php

namespace App\Models;

use App\Models\Concerns\Avatarable;
use Database\Factories\ContactFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Port từ refs/chatwoot/app/models/contact.rb.
// Bỏ ở B2: conversations/messages (B3), csat_survey_responses + notes (tính năng sau),
// Labelable (nhóm C), ip_lookup job, dispatcher events (đi cùng webhooks/automation),
// LlmFormattable (enterprise). availability_status chờ presence B4 — luôn 'offline'.
class Contact extends Model
{
    /** @use HasFactory<ContactFactory> */
    use Avatarable, HasFactory;

    public const TYPE_VISITOR = 'visitor';

    public const TYPE_LEAD = 'lead';

    public const TYPE_CUSTOMER = 'customer';

    // enum contact_type: { visitor: 0, lead: 1, customer: 2 }
    public const CONTACT_TYPES = [
        self::TYPE_VISITOR => 0,
        self::TYPE_LEAD => 1,
        self::TYPE_CUSTOMER => 2,
    ];

    public const PHONE_NUMBER_REGEX = '/^\+[1-9]\d{1,14}$/';

    // Devise.email_regexp — cố ý lỏng hơn rule email của Laravel để khớp bản gốc.
    public const EMAIL_REGEX = '/^[^@\s]+@[^@\s]+$/';

    // Default của DB chưa có trên model mới tạo — set sẵn để hook thăng hạng
    // visitor → lead nhìn thấy đúng trạng thái.
    protected $attributes = [
        'contact_type' => 0,
    ];

    protected $fillable = [
        'account_id',
        'name',
        'email',
        'phone_number',
        'identifier',
        'additional_attributes',
        'custom_attributes',
        'last_activity_at',
        'contact_type',
        'middle_name',
        'last_name',
        'location',
        'country_code',
        'blocked',
    ];

    protected function casts(): array
    {
        return [
            'additional_attributes' => 'array',
            'custom_attributes' => 'array',
            'last_activity_at' => 'datetime',
            'blocked' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // before_validation :prepare_contact_attributes + before_save :sync_contact_attributes
        static::saving(function (Contact $contact) {
            $contact->prepareContactAttributes();
            $contact->syncContactAttributes();
        });

        static::deleted(function (Contact $contact) {
            $contact->avatar?->delete();
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function contactInboxes(): HasMany
    {
        return $this->hasMany(ContactInbox::class);
    }

    public function inboxes(): BelongsToMany
    {
        return $this->belongsToMany(Inbox::class, 'contact_inboxes');
    }

    public function contactTypeName(): string
    {
        return array_search($this->contact_type, self::CONTACT_TYPES, true) ?: self::TYPE_VISITOR;
    }

    public function getSourceId(int $inboxId): string
    {
        return $this->contactInboxes()->where('inbox_id', $inboxId)->firstOrFail()->source_id;
    }

    public function availabilityStatus(): string
    {
        return 'offline';
    }

    public static function fromEmail(?string $email): ?self
    {
        return $email === null ? null : self::query()->where('email', mb_strtolower($email))->first();
    }

    // Contact.resolved_contacts — crm_v2 lọc theo lead, còn lại lọc theo
    // "có ít nhất một định danh".
    public function scopeResolvedContacts(Builder $query, bool $useCrmV2 = false): Builder
    {
        if ($useCrmV2) {
            return $query->where('contact_type', self::CONTACT_TYPES[self::TYPE_LEAD]);
        }

        return $query->whereRaw("(contacts.email <> '' OR contacts.phone_number <> '' OR contacts.identifier <> '')");
    }

    public function scopeOrderOnLastActivityAt(Builder $query, string $direction): Builder
    {
        return $query->orderByRaw("contacts.last_activity_at {$this->sqlDirection($direction)} NULLS LAST");
    }

    public function scopeOrderOnCreatedAt(Builder $query, string $direction): Builder
    {
        return $query->orderByRaw("contacts.created_at {$this->sqlDirection($direction)} NULLS LAST");
    }

    public function scopeOrderOnCompanyName(Builder $query, string $direction): Builder
    {
        return $query->orderByRaw("contacts.additional_attributes->>'company_name' {$this->sqlDirection($direction)} NULLS LAST");
    }

    public function scopeOrderOnCity(Builder $query, string $direction): Builder
    {
        return $query->orderByRaw("contacts.additional_attributes->>'city' {$this->sqlDirection($direction)} NULLS LAST");
    }

    public function scopeOrderOnCountryName(Builder $query, string $direction): Builder
    {
        return $query->orderByRaw("contacts.additional_attributes->>'country' {$this->sqlDirection($direction)} NULLS LAST");
    }

    // order_on_name: tên bắt đầu bằng số điện thoại/ký tự trống bị đẩy xuống cuối.
    public function scopeOrderOnName(Builder $query, string $direction): Builder
    {
        return $query->orderByRaw(
            "CASE
               WHEN contacts.name ~* '^\\+\\d*' THEN 'z'
               WHEN contacts.name ~* '^\\s*$' THEN 'z'
               ELSE LOWER(contacts.name)
             END {$this->sqlDirection($direction)}"
        );
    }

    private function sqlDirection(string $direction): string
    {
        return strtolower($direction) === 'desc' ? 'DESC' : 'ASC';
    }

    private function prepareContactAttributes(): void
    {
        // Email '' → null để unique constraint của DB không vướng chuỗi rỗng.
        $this->email = filled($this->email) ? mb_strtolower($this->email) : null;
        $this->additional_attributes = $this->additional_attributes ?: [];
        $this->custom_attributes = $this->custom_attributes ?: [];
    }

    // Contacts::SyncAttributes — đồng bộ location/country_code từ
    // additional_attributes và thăng hạng visitor → lead khi có định danh.
    private function syncContactAttributes(): void
    {
        $this->location = $this->additional_attributes['city'] ?? '';
        $this->country_code = $this->additional_attributes['country'] ?? '';

        if ($this->contact_type !== self::CONTACT_TYPES[self::TYPE_VISITOR]) {
            return;
        }

        if (filled($this->email) || filled($this->phone_number) || $this->socialDetailsPresent()) {
            $this->contact_type = self::CONTACT_TYPES[self::TYPE_LEAD];
        }
    }

    private function socialDetailsPresent(): bool
    {
        foreach ($this->additional_attributes ?? [] as $key => $value) {
            if (str_starts_with((string) $key, 'social_') && filled($value)) {
                return true;
            }
        }

        return false;
    }
}
