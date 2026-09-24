<?php

namespace App\Models;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Events\PreviousChanges;
use App\Http\Resources\ContactResource;
use App\Models\Concerns\Avatarable;
use App\Models\Concerns\Labelable;
use App\Models\Concerns\SelfValidating;
use App\Support\OnlineStatusTracker;
use App\Support\PhoneNumber;
use Database\Factories\ContactFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Port từ refs/chatwoot/app/models/contact.rb.
// Bỏ ở B2: conversations/messages (B3), csat_survey_responses + notes (tính năng sau),
// ip_lookup job, CONTACT_MERGED (đi cùng merge B10),
// LlmFormattable (enterprise).
class Contact extends Model
{
    /** @use HasFactory<ContactFactory> */
    use Avatarable, HasFactory, Labelable, SelfValidating;

    public const TYPE_VISITOR = 'visitor';

    public const TYPE_LEAD = 'lead';

    public const TYPE_CUSTOMER = 'customer';

    // enum contact_type: { visitor: 0, lead: 1, customer: 2 }
    public const CONTACT_TYPES = [
        self::TYPE_VISITOR => 0,
        self::TYPE_LEAD => 1,
        self::TYPE_CUSTOMER => 2,
    ];

    public const PHONE_NUMBER_REGEX = PhoneNumber::E164_REGEX;

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

    // Mọi đường ghi (form, sidebar, API, nhập CSV, kênh) đi qua đây nên cùng một
    // số luôn lưu cùng một chuỗi. Không quy đổi được thì giữ nguyên để
    // validationErrors()/discardInvalidAttrs() xử lý như đầu vào sai.
    protected function phoneNumber(): Attribute
    {
        return Attribute::set(fn (mixed $value) => is_string($value) && $value !== ''
            ? (PhoneNumber::normalize($value) ?? $value)
            : $value);
    }

    // Tra hồ sơ theo số điện thoại (khoá chống trùng) bằng đúng quy tắc lúc ghi.
    public function scopeWherePhoneNumber(Builder $query, string $phoneNumber): Builder
    {
        return $query->where('phone_number', PhoneNumber::normalize($phoneNumber) ?? $phoneNumber);
    }

    protected static function booted(): void
    {
        // before_validation :prepare_contact_attributes + before_save :sync_contact_attributes
        static::saving(function (Contact $contact) {
            $contact->prepareContactAttributes();
            $contact->syncContactAttributes();
        });

        static::created(function (Contact $contact) {
            DomainEvent::dispatch(EventType::CONTACT_CREATED, ['contact' => $contact]);
        });

        static::updated(function (Contact $contact) {
            DomainEvent::dispatch(EventType::CONTACT_UPDATED, [
                'contact' => $contact,
                'changed_attributes' => PreviousChanges::of($contact),
            ]);
        });

        static::deleted(function (Contact $contact) {
            $contact->avatar?->delete();

            // Gửi dữ liệu đã serialize thay vì model: listener async chạy sau khi
            // record đã bị xóa.
            DomainEvent::dispatch(EventType::CONTACT_DELETED, [
                'contact_data' => [...ContactResource::pushEventData($contact), 'account_id' => $contact->account_id],
            ]);
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

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
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

    // AvailabilityStatusable#contact_availability_status: theo presence Redis.
    public function availabilityStatus(): string
    {
        return OnlineStatusTracker::getPresence($this->account_id, 'Contact', $this->id) ? 'online' : 'offline';
    }

    /**
     * Validation của model Contact (email/identifier/phone_number + độ dài tên):
     * nguồn DUY NHẤT cho cả controller (422) lẫn đường nhập CSV (dòng lỗi).
     *
     * @return array<string, list<string>>
     */
    public function validationErrors(): array
    {
        $errors = [];
        $name = $this->name;

        if (is_string($name) && mb_strlen($name) > 255) {
            $errors['name'][] = 'Name is too long (maximum is 255 characters)';
        }

        $email = filled($this->email) ? mb_strtolower((string) $this->email) : null;

        if ($email !== null && ! preg_match(self::EMAIL_REGEX, $email)) {
            $errors['email'][] = 'Email Invalid email';
        }

        if ($email !== null && $this->attributeTaken('email', $email)) {
            $errors['email'][] = 'Email has already been taken';
        }

        if ($this->hasInvalidPhoneNumber()) {
            $errors['phone_number'][] = __('errors.contacts.phone_number_invalid');
        }

        if (filled($this->phone_number) && $this->attributeTaken('phone_number', $this->phone_number)) {
            $errors['phone_number'][] = 'Phone number has already been taken';
        }

        if (filled($this->identifier) && $this->attributeTaken('identifier', $this->identifier)) {
            $errors['identifier'][] = 'Identifier has already been taken';
        }

        return $errors;
    }

    /** @return list<string> */
    public function validationMessages(): array
    {
        return collect($this->validationErrors())->flatten()->values()->all();
    }

    private function hasInvalidPhoneNumber(): bool
    {
        return filled($this->phone_number) && ! preg_match(self::PHONE_NUMBER_REGEX, (string) $this->phone_number);
    }

    private function attributeTaken(string $column, mixed $value): bool
    {
        return self::query()
            ->where('account_id', $this->account_id)
            ->where($column, $value)
            ->when($this->exists, fn (Builder $query) => $query->whereKeyNot($this->getKey()))
            ->exists();
    }

    public static function fromEmail(?string $email): ?self
    {
        return $email === null ? null : self::query()->where('email', mb_strtolower($email))->first();
    }

    // Contact#discard_invalid_attrs (phone_number_format + email_format): định
    // danh khách tự nhập ở widget có thể sai định dạng — trả về giá trị cũ thay
    // vì làm hỏng cả lần ghi.
    public function discardInvalidAttrs(): void
    {
        if ($this->hasInvalidPhoneNumber()) {
            $this->phone_number = $this->getOriginal('phone_number');
        }

        if (filled($this->email) && ! preg_match(self::EMAIL_REGEX, (string) $this->email)) {
            $this->email = $this->getOriginal('email');
        }
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

    /**
     * Contacts::SyncAttributes — đồng bộ location/country_code từ
     * additional_attributes và thăng hạng visitor → lead.
     *
     * LỆCH CÓ CHỦ ĐÍCH so với Chatwoot gốc (`contact.rb#set_contact_type`, thăng
     * lead khi `additional_attributes` có bất kỳ khoá `social_*`): ở Yona người
     * lạ vừa nhắn vào từ một kênh mạng xã hội là **Liên hệ nháp**, chỉ thành
     * **Lead** khi đã có SỐ ĐIỆN THOẠI hoặc EMAIL — từ hồ sơ kênh hay do agent
     * nhập (docs/channel-capabilities.md §2.4, docs/glossary.md). Uid kênh không
     * gọi/gửi thư được nên không phải "đã xác nhận nhu cầu".
     * Agent vẫn chuyển tay được: `contact_type` nằm trong `$fillable`, và hàm này
     * chỉ NÂNG hạng, không bao giờ hạ.
     */
    private function syncContactAttributes(): void
    {
        $this->location = $this->additional_attributes['city'] ?? '';
        $this->country_code = $this->additional_attributes['country'] ?? '';

        if ($this->contact_type !== self::CONTACT_TYPES[self::TYPE_VISITOR]) {
            return;
        }

        if (filled($this->email) || filled($this->phone_number)) {
            $this->contact_type = self::CONTACT_TYPES[self::TYPE_LEAD];
        }
    }
}
