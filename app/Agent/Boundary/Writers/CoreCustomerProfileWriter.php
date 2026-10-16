<?php

namespace App\Agent\Boundary\Writers;

use App\Agent\Boundary\CoreRecords;
use App\Agent\Contracts\Ports\CustomerProfileWriter;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\CustomerDetails;
use App\Agent\ValueObjects\ProfileSkip;
use App\Agent\ValueObjects\ProfileUpdate;
use App\Models\Contact;
use App\Models\CustomAttributeDefinition;
use App\Support\AnonymousName;
use App\Support\PhoneNumber;
use Illuminate\Support\Collection;

// Ghi lời khai của khách vào hồ sơ của đúng hội thoại đang chạy. Lời khai chưa xác minh
// nên: chỉ điền chỗ trống (tên ẩn danh hệ thống đặt coi như trống), không ghi đè dữ liệu
// shop đang có, SĐT/email đang thuộc hồ sơ khác thì bỏ qua — tuyệt đối không gộp hồ sơ
// (gộp theo định danh chưa xác minh làm lộ lịch sử của người khác).
final class CoreCustomerProfileWriter implements CustomerProfileWriter
{
    private const CHECKBOX_TRUE = ['true', 'yes', 'có', 'co', '1'];

    private const CHECKBOX_FALSE = ['false', 'no', 'không', 'khong', '0'];

    private const NUMERIC_TYPES = ['number', 'currency', 'percent'];

    public function save(ConversationRef $conversation, CustomerDetails $details): ?ProfileUpdate
    {
        $model = CoreRecords::conversation($conversation);
        $contact = $model?->contact;

        if ($model === null || $contact === null || $contact->account_id !== $conversation->accountId) {
            return null;
        }

        $outcomes = [];

        if ($details->name !== null) {
            $hasRealName = filled($contact->name) && ! AnonymousName::isGenerated($model->account, (string) $contact->name);
            $outcomes['name'] = $this->fill($contact, 'name', trim($details->name), $hasRealName ? (string) $contact->name : null);
        }

        if ($details->phoneNumber !== null) {
            $outcomes['phone_number'] = $this->fillIdentifier($contact, 'phone_number', PhoneNumber::normalize($details->phoneNumber));
        }

        if ($details->email !== null) {
            $email = mb_strtolower(trim($details->email));
            $outcomes['email'] = $this->fillIdentifier($contact, 'email', preg_match(Contact::EMAIL_REGEX, $email) === 1 ? $email : null);
        }

        if ($details->city !== null) {
            $outcomes['city'] = $this->fillAttribute($contact, 'additional_attributes', 'city', trim($details->city));
        }

        $outcomes = [...$outcomes, ...$this->fillCustomAttributes($contact, $details->attributes)];

        if ($contact->isDirty()) {
            $contact->save();
        }

        return new ProfileUpdate(
            array_keys(array_filter($outcomes, fn (?ProfileSkip $outcome) => $outcome === null)),
            array_filter($outcomes, fn (?ProfileSkip $outcome) => $outcome !== null),
        );
    }

    // SĐT/email: sai định dạng hay đang thuộc hồ sơ khác thì bỏ, không bao giờ gộp.
    // Mọi hàm fill* trả null khi đã ghi (hoặc hồ sơ đã có đúng giá trị đó), ngược lại lý do bỏ.
    private function fillIdentifier(Contact $contact, string $field, ?string $value): ?ProfileSkip
    {
        if ($value === null) {
            return ProfileSkip::InvalidFormat;
        }

        $current = filled($contact->{$field}) ? (string) $contact->{$field} : null;
        $takenElsewhere = Contact::query()
            ->where('account_id', $contact->account_id)
            ->where($field, $value)
            ->whereKeyNot($contact->id)
            ->exists();

        if ($current === null && $takenElsewhere) {
            return ProfileSkip::BelongsToAnotherProfile;
        }

        return $this->fill($contact, $field, $value, $current);
    }

    private function fill(Contact $contact, string $field, string $value, ?string $current): ?ProfileSkip
    {
        if ($current !== null) {
            return mb_strtolower($current) === mb_strtolower($value) ? null : ProfileSkip::AlreadySet;
        }

        $contact->{$field} = $value;

        return null;
    }

    private function fillAttribute(Contact $contact, string $column, string $key, string|int|float|bool $value): ?ProfileSkip
    {
        $attributes = $contact->{$column} ?? [];
        $current = $attributes[$key] ?? null;

        if (filled($current) || is_bool($current)) {
            return mb_strtolower(var_export($current, true)) === mb_strtolower(var_export($value, true)) ? null : ProfileSkip::AlreadySet;
        }

        $contact->{$column} = [...$attributes, $key => $value];

        return null;
    }

    /**
     * @param  array<string, string>  $values
     * @return array<string, ?ProfileSkip>
     */
    private function fillCustomAttributes(Contact $contact, array $values): array
    {
        if ($values === []) {
            return [];
        }

        /** @var Collection<string, CustomAttributeDefinition> $definitions */
        $definitions = CustomAttributeDefinition::query()
            ->where('account_id', $contact->account_id)
            ->withAttributeModel(CustomAttributeDefinition::MODEL_CONTACT)
            ->get()
            ->keyBy('attribute_key');

        $outcomes = [];

        foreach ($values as $key => $raw) {
            $definition = $definitions->get($key);
            $value = $definition === null ? ProfileSkip::UnknownAttribute : $this->attributeValue($definition, trim($raw));
            $outcomes[$key] = $value instanceof ProfileSkip ? $value : $this->fillAttribute($contact, 'custom_attributes', $key, $value);
        }

        return $outcomes;
    }

    // Giá trị đúng kiểu thuộc tính shop khai; sai thì trả lý do bỏ qua.
    private function attributeValue(CustomAttributeDefinition $definition, string $raw): string|int|float|bool|ProfileSkip
    {
        $type = (string) $definition->attribute_display_type;

        if (filled($definition->regex_pattern) && @preg_match('/'.str_replace('/', '\/', (string) $definition->regex_pattern).'/u', $raw) !== 1) {
            return ProfileSkip::InvalidFormat;
        }

        if ($type === 'list') {
            $options = array_map('strval', (array) ($definition->attribute_values ?? []));
            $match = collect($options)->first(fn (string $option) => mb_strtolower($option) === mb_strtolower($raw));

            return $match ?? ProfileSkip::NotAnOption;
        }

        if (in_array($type, self::NUMERIC_TYPES, true)) {
            return is_numeric($raw) ? $raw + 0 : ProfileSkip::InvalidFormat;
        }

        if ($type === 'checkbox') {
            $folded = mb_strtolower($raw);

            return match (true) {
                in_array($folded, self::CHECKBOX_TRUE, true) => true,
                in_array($folded, self::CHECKBOX_FALSE, true) => false,
                default => ProfileSkip::InvalidFormat,
            };
        }

        return $raw === '' ? ProfileSkip::InvalidFormat : $raw;
    }
}
