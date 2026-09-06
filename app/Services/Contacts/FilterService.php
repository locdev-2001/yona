<?php

namespace App\Services\Contacts;

use App\Models\Contact;
use App\Models\CustomAttributeDefinition;
use App\Services\Filters\BaseFilterService;
use App\Services\Filters\FilterKeys;
use Illuminate\Database\Eloquent\Builder;

// Port từ Contacts::FilterService của Chatwoot — dùng chung lõi với bộ lọc hội
// thoại, chỉ khác bảng, tập thuộc tính chuẩn và cách chuẩn hoá số điện thoại.
class FilterService extends BaseFilterService
{
    /** @return Builder<Contact> */
    public function perform(): Builder
    {
        $contacts = $this->baseRelation();
        $this->applyPayload($contacts);

        return $contacts;
    }

    protected function standardAttributes(): array
    {
        return FilterKeys::CONTACTS;
    }

    protected function tableName(): string
    {
        return 'contacts';
    }

    protected function customAttributeModel(): string
    {
        return CustomAttributeDefinition::MODEL_CONTACT;
    }

    // filter_values: khi so bằng, số điện thoại luôn về dạng E.164 có dấu +.
    // Với contains/starts_with thì giữ nguyên chuỗi người dùng gõ.
    protected function normalizeValue(string $attributeKey, string $operator, mixed $value): mixed
    {
        if ($attributeKey !== 'phone_number'
            || ! is_string($value)
            || ! in_array($operator, ['equal_to', 'not_equal_to'], true)) {
            return $value;
        }

        return '+'.str_replace('+', '', trim($value));
    }

    /** @return Builder<Contact> */
    private function baseRelation(): Builder
    {
        return Contact::query()
            ->where('account_id', $this->account->id)
            ->resolvedContacts(useCrmV2: $this->account->featureEnabled('crm_v2'));
    }
}
